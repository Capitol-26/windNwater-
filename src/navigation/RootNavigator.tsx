// RootNavigator.tsx — root native-stack navigator for the app
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import FengShuiRatingScreen from '../screens/FengShuiRatingScreen';
import ScanRoomScreen from '../screens/ScanRoomScreen';
import { RootStackParamList } from './navigation.types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name="ScanRoom"
        component={ScanRoomScreen}
        options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
      />
      <Stack.Screen name="FengShuiRating" component={FengShuiRatingScreen} />
    </Stack.Navigator>
  );
}
