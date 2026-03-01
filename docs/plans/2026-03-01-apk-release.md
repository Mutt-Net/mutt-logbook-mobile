# APK Release Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the EAS-based release workflow with a self-contained Gradle build that produces both debug and release-signed APKs on every `v*` tag push.

**Architecture:** `expo prebuild` generates the native Android project on the CI runner, Gradle builds both APK variants, a keystore stored as GitHub Secrets signs the release build, both APKs are attached to a GitHub Release.

**Tech Stack:** GitHub Actions, Expo CLI, Gradle, Android SDK (pre-installed on `ubuntu-latest`), `softprops/action-gh-release@v2`

---

### Task 1: Generate the release keystore (local, one-time)

**Files:** None — produces `mutt-logbook.keystore` locally (do NOT commit this file)

**Step 1: Generate the keystore**

Run this in any directory (desktop is fine):

```bash
keytool -genkey -v \
  -keystore mutt-logbook.keystore \
  -alias mutt-logbook \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

When prompted, fill in whatever values you like. Remember the keystore password and key password — you'll need them in the next step.

**Step 2: Base64-encode it**

On Linux/Mac:
```bash
base64 -w 0 mutt-logbook.keystore
```

On Windows (PowerShell):
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("mutt-logbook.keystore"))
```

Copy the output — this is your `KEYSTORE_BASE64` value.

**Step 3: Add four secrets to the GitHub repo**

Go to: `https://github.com/<your-username>/mutt-logbook-mobile/settings/secrets/actions`

Add these four secrets:

| Name | Value |
|---|---|
| `KEYSTORE_BASE64` | base64 string from step 2 |
| `KEYSTORE_PASSWORD` | keystore password you chose |
| `KEY_ALIAS` | `mutt-logbook` |
| `KEY_PASSWORD` | key password you chose (same as keystore password if you used one) |

---

### Task 2: Rewrite the release workflow

**Files:**
- Modify: `.github/workflows/release.yml`

**Step 1: Replace the entire file contents**

```yaml
name: Release APK

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    name: Build and release APK
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Cache Gradle
        uses: actions/cache@v4
        with:
          path: |
            ~/.gradle/caches
            ~/.gradle/wrapper
          key: gradle-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
          restore-keys: gradle-${{ runner.os }}-

      - name: Install dependencies
        run: npm ci

      - name: Generate native Android project
        run: npx expo prebuild --platform android --clean --no-install

      - name: Build debug APK
        run: cd android && ./gradlew assembleDebug

      - name: Setup release signing
        env:
          KEYSTORE_BASE64: ${{ secrets.KEYSTORE_BASE64 }}
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
        run: |
          echo "$KEYSTORE_BASE64" | base64 --decode > android/app/mutt-logbook.keystore
          {
            echo "MYAPP_UPLOAD_STORE_FILE=mutt-logbook.keystore"
            echo "MYAPP_UPLOAD_STORE_PASSWORD=$KEYSTORE_PASSWORD"
            echo "MYAPP_UPLOAD_KEY_ALIAS=$KEY_ALIAS"
            echo "MYAPP_UPLOAD_KEY_PASSWORD=$KEY_PASSWORD"
          } >> android/gradle.properties

      - name: Build release APK
        run: cd android && ./gradlew assembleRelease

      - name: Prepare artifacts
        run: |
          cp android/app/build/outputs/apk/debug/app-debug.apk \
            "mutt-logbook-${{ github.ref_name }}-debug.apk"
          cp android/app/build/outputs/apk/release/app-release.apk \
            "mutt-logbook-${{ github.ref_name }}-release.apk"

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          name: "Mutt Logbook ${{ github.ref_name }}"
          body: |
            ## Mutt Logbook ${{ github.ref_name }}

            **Installation:** Download an APK and sideload on Android.
            Enable "Install from unknown sources" in device settings first.

            - `*-release.apk` — signed release build
            - `*-debug.apk` — debug build (larger, includes dev tools)
          files: |
            mutt-logbook-${{ github.ref_name }}-debug.apk
            mutt-logbook-${{ github.ref_name }}-release.apk
          draft: false
          prerelease: false
```

**Step 2: Validate YAML syntax**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml'))" && echo "valid"
```

Expected: `valid`

**Step 3: Commit**

```bash
git add .github/workflows/release.yml docs/plans/
git commit -m "feat: local Gradle APK release workflow, no EAS required"
```

---

### Task 3: Trigger the first release

**Step 1: Push the commit**

```bash
git push origin mobile
```

**Step 2: Tag and push**

```bash
git tag v1.0.0
git push origin v1.0.0
```

**Step 3: Watch the workflow**

```bash
gh run list --limit 5
gh run watch
```

Expected: workflow completes successfully, GitHub Release created at `https://github.com/<your-username>/mutt-logbook-mobile/releases/tag/v1.0.0` with two APK files attached.

---

### Troubleshooting

**`assembleRelease` produces `app-release-unsigned.apk` instead of `app-release.apk`**

The Expo-generated `build.gradle` didn't pick up the `MYAPP_UPLOAD_*` properties. Check:
1. The `Setup release signing` step ran without errors
2. The property names in `android/app/build.gradle` — look for the `signingConfigs.release` block and confirm the property names match

**`expo prebuild` fails with missing module**

Add `--no-install` flag if not already present, and confirm `npm ci` ran successfully before it.

**`keytool` not found on Windows**

It ships with the JDK. Run from: `C:\Program Files\Eclipse Adoptium\jdk-17\bin\keytool` (adjust path for your JDK install).
