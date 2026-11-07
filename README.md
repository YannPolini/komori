# Komori

Anime discovery and tracking app for Cross Platform Development, WS2026.

**Team:** Yann Polini ([@YannPolini](https://github.com/YannPolini)) and Diego Traxler, Group G.

[Kanban board](https://github.com/users/YannPolini/projects/6/views/1)

## Current status

Komori has anime discovery through AniList, watch lists, ratings and recommendations. The Android and iOS apps keep lists, ratings, preferences and saved title details in SQLite so they can be reopened offline. Web previews use browser storage. Accounts use Supabase Auth and can sync their library between devices. Watch reminders stay on the device where you set them.

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

For accounts, set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in a local `.env` (copy `.env.example`) and restart Expo. Use a publishable key, never a secret or service-role key. Enable email/password sign-in and email confirmation in the Supabase project. The default confirmation link works if the user returns to Komori to sign in. To use in-app verification codes, include `{{ .Token }}` in the Confirm signup email template.

The guest library works without Supabase. It is separate from signed-in libraries. Native sessions use SecureStore. Web previews hold sessions in memory and ask you to sign in again after a reload.

For sync, apply [the profile migration](supabase/migrations/20261107180000_komori_profiles.sql) to that Supabase project. It creates the private profile table and the revision-checked save function. If two devices change the same revision, use Account to choose which copy to keep.

To try reminders on Android, save a title to a watch list, open its details, choose a future date and time, and allow notifications. Leave the app in the background. The reminder works without internet and opens the saved title when tapped. Android may delay delivery based on battery and alarm settings.

`npm run ios` opens an iOS simulator and requires macOS and Xcode. It is not needed to test this starter on an iPhone through Expo Go from Windows.

## Checks

```sh
npm run typecheck
npx expo install --check
npx expo-doctor
npm test -- --runInBand
```

These check TypeScript, dependency/configuration compatibility and the automated tests. A successful check does not establish that the app runs on a device, so features were also tested manually during development.

Jest tests live in `__tests__` folders next to the code they cover. They test the library and rating rules, recommendation scoring, the AniList client (with fixed sample responses in `src/services/__fixtures__/`), catalog feeds, the SQLite profile store, secure session storage, cloud sync and conflicts, and reminders.

Verification on 7 November 2026 (`dev` after #12-#19): TypeScript passed and all 73 tests in 8 suites passed. Features were tested manually on Android.

`npm audit` reports 30 findings (7 low, 16 moderate, 7 high) on 7 November 2026. These include transitive build/tooling dependencies. The audit's forced upgrade suggestions conflict with the selected Expo/React Native versions, so they were not applied. Review the findings again when upgrading the framework.

## Files

- `src/app/`: Expo Router screens. `(tabs)/` holds Home, Discover and Lists; `anime/[id].tsx` is Details, `list/[id].tsx` a list, `account.tsx` the account screen. `_layout.tsx` files define the stack, tabs and app-wide providers.
- `src/components/`: shared UI such as cards, rating input, loading/error states and dialogs.
- `src/features/catalog/`: catalog model, feeds, release dates, caching and data hooks.
- `src/features/library/`: watch status, list and rating rules, the profile reducer, shared library state and the local profile repository.
- `src/features/recommendations/`: candidate selection, scoring and reasons.
- `src/features/account/`: Supabase Auth, secure session storage, sign-in and sign-out.
- `src/features/sync/`: cloud profile sync with revision checks and conflict choices.
- `src/features/reminders/`: local watch reminders and notification handling.
- `src/services/`: AniList GraphQL client and connectivity check.
- `src/storage/`: SQLite record store (browser storage for web previews).
- `src/theme.ts`: colors, spacing and radii.
- `supabase/migrations/`: private profile table, owner policies and the revision-checked save function.
- `.env.example`: the two Supabase variables needed for accounts and sync.
- `App.tsx`: course starter screen, kept from the template. The app entry is `expo-router/entry` (see `package.json`).
- `app.json`: app name, scheme and Expo plugins.
- `package.json` / `package-lock.json`: scripts and dependency versions.
- `tsconfig.json`: strict TypeScript configuration.
- `.gitignore`: excludes dependencies, generated output, local settings and secrets.
- `.editorconfig` / `.gitattributes`: shared whitespace and line-ending rules.

## Team workflow

Both students should make meaningful commits under their own Git identities. For each small change, create a branch, commit it, push it and open a pull request for the other teammate to review. Use `npm ci` after cloning or pulling dependency changes. Commit the lockfile whenever dependencies change.

Never commit credentials or `.env` files. Values shipped in a client app are not secret merely because they come from an environment variable.

## AI Usage

OpenAI ChatGPT/Codex assisted with the initial repository setup: README, dependency selection, Expo configuration, ignore rules, editor settings and setup checks. The initial counter screen comes from the official course template. Both students are responsible for reviewing, understanding and explaining the submission. Update this section when AI contributes to further implementation.

For #12, Claude and Codex assisted with the tab and stack navigation, the app header and the shared loading and error states.
For #13, Claude and Codex assisted with the AniList catalog client, rate limiting, catalog feeds and release dates, the switch from Jikan to AniList, and the catalog tests.
For #14, Claude and Codex assisted with the watch status and custom list rules, the shared library state, the Lists and list detail screens, the Jest setup and the rules tests.
For #15, Claude and Codex assisted with the rating and genre preference rules, recommendation scoring and candidates, the rating and genre screens, and the related tests.

Codex also assisted with SQLite storage, catalog caching, offline behavior and the storage tests for #17.
For #16, Codex assisted with the account screen, Supabase Auth integration, secure session storage and account tests.
For #18, Codex assisted with the private profile migration, revision checks, sync and conflict handling, and tests.
For #19, Codex assisted with local reminders, notification permissions, opening titles from notifications, cleanup and tests.
