// FloorHomography.m — finds the floor in a room-scan video with Apple's Vision framework and returns the
// homography that flattens it to a top-down view
#import <AVFoundation/AVFoundation.h>
#import <React/RCTBridgeModule.h>
#import <Vision/Vision.h>
#include "Homography.h"

static const NSInteger kSampleCount = 8;
static const CGFloat kMaxSampleSide = 720;

@interface FloorHomography : NSObject <RCTBridgeModule>
@end

@implementation FloorHomography

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup { return NO; }

static NSArray<NSNumber *> *XYPair(double x, double y) { return @[@(x), @(y)]; }

// Vision reports points with the origin at the bottom-left; the app and the server use the top-left
static NSArray<NSNumber *> *ImagePoint(CGPoint p) { return XYPair(p.x, 1.0 - p.y); }

static double QuadArea(const double q[4][2]) {
  double sum = 0;
  for (int i = 0; i < 4; i++) {
    int j = (i + 1) % 4;
    sum += q[i][0] * q[j][1] - q[j][0] * q[i][1];
  }
  return fabs(sum) / 2;
}

// Resolves with { timestamp, confidence, quad: [[x,y] x4 as TL,TR,BR,BL], homography: [9] } where the
// homography maps normalised image coordinates (0-1, origin top-left) onto the unit square of the floor.
// Resolves with null when no floor-like quad is found, so the scan still goes ahead without it.
RCT_EXPORT_METHOD(detectFloor:(NSString *)videoPath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
    NSString *clean = [videoPath hasPrefix:@"file://"] ? [videoPath substringFromIndex:7] : videoPath;
    AVURLAsset *asset = [AVURLAsset URLAssetWithURL:[NSURL fileURLWithPath:clean] options:nil];
    Float64 duration = CMTimeGetSeconds(asset.duration);
    if (!isfinite(duration) || duration <= 0) {
      reject(@"bad_video", @"Could not read the video.", nil);
      return;
    }

    AVAssetImageGenerator *generator = [[AVAssetImageGenerator alloc] initWithAsset:asset];
    generator.appliesPreferredTrackTransform = YES; // upright frames, as the person saw them
    generator.maximumSize = CGSizeMake(kMaxSampleSide, kMaxSampleSide);
    generator.requestedTimeToleranceBefore = kCMTimeZero;
    generator.requestedTimeToleranceAfter = kCMTimeZero;

    double bestScore = 0, bestTime = 0, bestConfidence = 0;
    double bestQuad[4][2] = {{0}};
    BOOL found = NO;

    for (NSInteger i = 0; i < kSampleCount; i++) {
      Float64 seconds = duration * (i + 0.5) / kSampleCount;
      NSError *error = nil;
      CGImageRef image = [generator copyCGImageAtTime:CMTimeMakeWithSeconds(seconds, 600) actualTime:NULL error:&error];
      if (!image) continue;

      VNDetectRectanglesRequest *request = [[VNDetectRectanglesRequest alloc] init];
      request.minimumAspectRatio = 0.2;
      request.maximumAspectRatio = 1.0;
      request.minimumSize = 0.25;       // the floor fills a good part of the frame
      request.quadratureTolerance = 30; // a floor seen at an angle is far from a right-angled quad
      request.minimumConfidence = 0.5;
      request.maximumObservations = 8;

      VNImageRequestHandler *handler = [[VNImageRequestHandler alloc] initWithCGImage:image options:@{}];
      BOOL ok = [handler performRequests:@[request] error:&error];
      CGImageRelease(image);
      if (!ok) continue;

      for (VNRectangleObservation *o in request.results) {
        // Vision's y runs upward: a floor sits in the lower half of the frame
        double centreY = (o.topLeft.y + o.topRight.y + o.bottomRight.y + o.bottomLeft.y) / 4;
        if (centreY > 0.5) continue;
        double quad[4][2] = {
          {o.topLeft.x, 1 - o.topLeft.y}, {o.topRight.x, 1 - o.topRight.y},
          {o.bottomRight.x, 1 - o.bottomRight.y}, {o.bottomLeft.x, 1 - o.bottomLeft.y},
        };
        double score = o.confidence * QuadArea(quad);
        if (score > bestScore) {
          bestScore = score; bestTime = seconds; bestConfidence = o.confidence;
          memcpy(bestQuad, quad, sizeof(quad));
          found = YES;
        }
      }
    }

    if (!found) { resolve([NSNull null]); return; }

    const double unit[4][2] = {{0, 0}, {1, 0}, {1, 1}, {0, 1}};
    double h[9];
    if (!WNWHomographyFromQuads(bestQuad, unit, h)) { resolve([NSNull null]); return; }

    NSMutableArray *matrix = [NSMutableArray arrayWithCapacity:9];
    for (int i = 0; i < 9; i++) [matrix addObject:@(h[i])];
    NSMutableArray *quad = [NSMutableArray arrayWithCapacity:4];
    for (int i = 0; i < 4; i++) [quad addObject:XYPair(bestQuad[i][0], bestQuad[i][1])];

    resolve(@{ @"timestamp": @(bestTime), @"confidence": @(bestConfidence), @"quad": quad, @"homography": matrix });
  });
}

@end
