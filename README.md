# Komori

Anime discovery and tracking app for Cross Platform Development, WS2026.

**Team:** Yann Polini ([@YannPolini](https://github.com/YannPolini)) and Diego Traxler, Group G.

## Current status

Initial project setup only. The app currently displays the course starter's counter screen. Komori's discovery, tracking, accounts, reminders and offline features are planned and are not implemented yet.

Android is the required course platform. iOS is optional and can also be used for development testing.

## Starter and framework

Based on the [official FHTW-CPD React Native / Expo template](https://github.com/FHTW-CPD/starter-react-native-expo), revision `c13dce216551ca96805b9c6d4da041a7516be06a`. Its `App.tsx` and strict TypeScript configuration are preserved. The starter files were imported into the team's existing empty repository.

The template's Expo SDK 51 dependencies were updated to SDK 54, using the versions from Expo's SDK 54 TypeScript starter. SDK 54 was chosen for compatibility with App Store Expo Go on a physical iPhone. [Expo Go compatibility documentation](https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/).

- React Native 0.81.5 and React 19.1.
- Expo SDK 54.
- TypeScript with strict checking.
- npm, with committed `package-lock.json` for reproducible installs.

## Requirements

- Node.js 24 LTS and npm. Initial setup uses Node 24.19.0 and npm 11.17.0.
- Git.
- Either an Android device/emulator or, for optional iOS testing, an iPhone with compatible Expo Go.

No global Expo CLI installation is needed. Keep the checkout and dependencies in a local code folder, outside synced course documents.

## Install and run

```sh
git clone https://github.com/YannPolini/komori.git
cd komori
npm ci
npm start
```

For iPhone testing, install Expo Go from the App Store. Put the phone and computer on the same network, scan the terminal's QR code with the iPhone camera, and open the project in Expo Go. Allow local network access if prompted. This starter targets SDK 54, so check the compatibility link above if Expo Go reports a version mismatch.

For the required Android check, install Android Studio and use its Device Manager to create and start an Android virtual device. Set `ANDROID_HOME` to your Android SDK directory and add its `platform-tools` and `emulator` folders to `PATH`. Then run:

```sh
npm run android
```

On Windows, the usual SDK directory is `%LOCALAPPDATA%\Android\Sdk`. A physical Android device with compatible Expo Go is another option.

`npm run ios` opens an iOS simulator and requires macOS and Xcode. It is not needed to test this starter on an iPhone through Expo Go from Windows.

## Checks

```sh
npm run typecheck
npx expo install --check
npx expo-doctor
```

These check TypeScript and dependency/configuration compatibility. A successful check or bundle export does not establish that the app runs on a device. Automated feature tests will be added with the corresponding features.

Initial setup verification on 14 October 2026: TypeScript passed, Expo dependency versions matched, Expo Doctor passed all 18 checks, and the Android bundle export succeeded. Device testing has not been completed.

The dependency audit still reports 35 findings (12 moderate, 23 high) after compatible updates. These include transitive build/tooling dependencies. The audit's forced upgrade suggestions conflict with the selected Expo/React Native versions, so they were not applied. Review the findings again when upgrading the framework.

## Files

- `App.tsx`: course starter screen and app entry component.
- `app.json`: app name and Expo configuration.
- `package.json` / `package-lock.json`: scripts and dependency versions.
- `tsconfig.json`: strict TypeScript configuration.
- `.gitignore`: excludes dependencies, generated output, local settings and secrets.
- `.editorconfig` / `.gitattributes`: shared whitespace and line-ending rules.

## Team workflow

Both students should make meaningful commits under their own Git identities. For each small change, create a branch, commit it, push it and open a pull request for the other teammate to review. Use `npm ci` after cloning or pulling dependency changes. Commit the lockfile whenever dependencies change.

Add navigation, shared state, API access, persistence and native feature packages when those features are started. Never commit credentials or `.env` files. Values shipped in a client app are not secret merely because they come from an environment variable.

## AI Usage

OpenAI ChatGPT/Codex assisted with the initial repository setup: README, dependency selection, Expo configuration, ignore rules, editor settings and setup checks. The initial counter screen comes from the official course template. Both students are responsible for reviewing, understanding and explaining the submission. Update this section when AI contributes to further implementation.
