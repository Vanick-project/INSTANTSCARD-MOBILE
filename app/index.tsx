// app/index.tsx
import React from 'react';
import { Redirect } from 'expo-router';
import { authEntryPath } from '../src/config/featureFlags';

export default function Index() {
  return <Redirect href={authEntryPath()} />;
}
