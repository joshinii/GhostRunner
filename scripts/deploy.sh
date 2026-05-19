#!/bin/bash
set -e
echo "Building Ghost Strategist for iOS..."
npx eas build --platform ios --profile preview
echo "Build submitted. Check https://expo.dev for status."
