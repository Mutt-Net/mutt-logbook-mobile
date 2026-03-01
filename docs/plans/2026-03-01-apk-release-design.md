# APK Release Workflow Design

**Date:** 2026-03-01

## Goal

Automate building and publishing both a debug and release-signed APK to GitHub Releases whenever a `v*` tag is pushed. No Expo account or EAS required.

## Approach

Local Gradle build via GitHub Actions. `expo prebuild` generates the native Android project from Expo config. Gradle builds both APK variants. Artifacts are attached to a GitHub Release.

## Trigger

Push of any tag matching `v*`.

## Build Steps

1. Checkout repo
2. Setup Node 20 (npm cache)
3. Setup Java 17 (Temurin)
4. Cache Gradle dependencies
5. `npm ci`
6. `npx expo prebuild --platform android --clean`
7. `cd android && ./gradlew assembleDebug`
8. Decode `KEYSTORE_BASE64` secret → write to `android/app/mutt-logbook.keystore`
9. Append signing properties to `android/gradle.properties`
10. `cd android && ./gradlew assembleRelease`
11. Rename APKs with tag name
12. Create GitHub Release with both APKs

## Signing

Release APK uses a keystore stored as GitHub Secrets. The Expo-generated `build.gradle` reads signing config from `gradle.properties` via `MYAPP_UPLOAD_*` properties.

### Required GitHub Secrets

| Secret | Description |
|---|---|
| `KEYSTORE_BASE64` | base64-encoded `.keystore` file |
| `KEYSTORE_PASSWORD` | keystore password |
| `KEY_ALIAS` | key alias |
| `KEY_PASSWORD` | key password |

### Keystore Generation (one-time, local)

```bash
keytool -genkey -v \
  -keystore mutt-logbook.keystore \
  -alias mutt-logbook \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Encode for GitHub Secret
base64 -w 0 mutt-logbook.keystore
```

## Output Artifacts

- `mutt-logbook-<tag>-debug.apk`
- `mutt-logbook-<tag>-release.apk`

## What Changes

Replace all EAS steps in `.github/workflows/release.yml` with `expo prebuild` + Gradle. Trigger and GitHub Release creation are unchanged.
