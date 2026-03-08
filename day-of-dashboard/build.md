npm i -D expo-dev-client
npx expo prebuild -p ios
npx expo run:ios --device

Build & install the Dev Client to your iPhone from Xcode (Development profile)
	1.	In your project, run npx expo prebuild -p ios (if you haven’t already).
	2.	Open ios/EventPilotDayofDashboard.xcworkspace in Xcode.
	3.	Select your iPhone in the device selector (next to the Run ▶ button).
	4.	Target YourApp → Signing & Capabilities: “Automatically manage signing” ON, correct Team chosen.
	5.	Press Run ▶. Xcode will sign with your Development profile, build, and install the app on your iPhone.


Then to restart and re-launch the app:
npx expo start --dev-client



Finally to build and ship, use xcode.