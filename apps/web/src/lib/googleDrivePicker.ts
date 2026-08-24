"use client";

/**
 * Google Drive folder picker — client-side, `drive.file`-scoped.
 *
 * Why this exists: the backend OAuth flow used to request the `drive.readonly`
 * scope and enumerate a user's ENTIRE Drive (GET /oauth/google/folders ->
 * `files.list` with no folder-scoped `q`) so the old picker UI could show a
 * dropdown of every folder. `drive.readonly` is a Google-classified
 * "restricted" scope -- same tier as full Gmail access -- which requires an
 * annual CASA security assessment (a paid third-party audit) to keep using in
 * production, on top of standard OAuth verification.
 *
 * `drive.file` avoids that entirely: it's non-restricted (no CASA), but it
 * only grants access to files/folders the user explicitly opens through a
 * Google-provided picker UI -- the backend can no longer ask "list every
 * folder in this Drive" the way it used to. That's what this module replaces
 * that with: Google's own Picker widget, launched here in the browser.
 *
 * Flow:
 *   1. Get a short-lived `drive.file`-scoped access token via Google Identity
 *      Services' token client (a distinct, browser-only OAuth path from the
 *      server-side authorization-code flow oauth.service.ts still uses to get
 *      a long-lived refresh token for background sync -- this token is only
 *      ever used to open the Picker, never sent to our backend or stored).
 *   2. Load and open Google's Picker widget, scoped to folder selection.
 *   3. Return the folder the user picked; the caller (media/page.tsx) then
 *      POSTs its id/name to the existing POST /oauth/google/select-folder
 *      endpoint, same as before. Selecting a folder here is also what grants
 *      the app's `drive.file` access to that folder and its contents, so the
 *      backend's later `files.list` with `'<folderId>' in parents` (see
 *      GoogleDriveService.listNewFilesInFolder) keeps working unmodified.
 *
 * Requires two env vars (see apps/web/.env.example for setup notes):
 *   NEXT_PUBLIC_GOOGLE_CLIENT_ID      -- same OAuth client ID as GOOGLE_CLIENT_ID
 *                                        (client IDs are public by design, safe
 *                                        to expose to the browser)
 *   NEXT_PUBLIC_GOOGLE_PICKER_API_KEY -- a separate API key, HTTP-referrer
 *                                        restricted to this app's domain(s),
 *                                        with only the Google Picker API enabled
 */

declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

const GIS_SCRIPT_ID = 'google-identity-services-script';
const GAPI_SCRIPT_ID = 'google-api-client-script';

function loadScript(id: string, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function getDriveFileAccessToken(clientId: string): Promise<string> {
  await loadScript(GIS_SCRIPT_ID, 'https://accounts.google.com/gsi/client');

  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services failed to load.'));
      return;
    }
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (response: any) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        resolve(response.access_token as string);
      },
    });
    tokenClient.requestAccessToken({ prompt: '' });
  });
}

async function loadPickerLibrary(): Promise<void> {
  await loadScript(GAPI_SCRIPT_ID, 'https://apis.google.com/js/api.js');
  await new Promise<void>((resolve, reject) => {
    if (!window.gapi) {
      reject(new Error('Google API client failed to load.'));
      return;
    }
    window.gapi.load('picker', { callback: () => resolve() });
  });
}

export interface PickedGoogleDriveFolder {
  id: string;
  name: string;
}

/**
 * Opens Google's Picker UI scoped to folder selection. Resolves with the
 * chosen folder, or `null` if the user closes the picker without choosing
 * one. Throws if the required env vars aren't configured.
 */
export async function pickGoogleDriveFolder(): Promise<PickedGoogleDriveFolder | null> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY;

  if (!clientId || !apiKey) {
    throw new Error(
      'Google Drive folder picker is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_PICKER_API_KEY.',
    );
  }

  const [accessToken] = await Promise.all([getDriveFileAccessToken(clientId), loadPickerLibrary()]);

  return new Promise((resolve) => {
    const picker = window.google;
    const view = new picker.picker.DocsView(picker.picker.ViewId.FOLDERS)
      .setSelectFolderEnabled(true)
      .setIncludeFolders(true);

    const builder = new picker.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(apiKey)
      .setTitle('Choose a folder for Oyinca to watch')
      .setCallback((data: any) => {
        if (data.action === picker.picker.Action.PICKED) {
          const doc = data.docs?.[0];
          resolve(doc ? { id: doc.id, name: doc.name } : null);
        } else if (data.action === picker.picker.Action.CANCEL) {
          resolve(null);
        }
      })
      .build();

    builder.setVisible(true);
  });
}
