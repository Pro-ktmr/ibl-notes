/** Extract a Google Drive folder ID from a folder URL. */
export function extractFolderId(url: string): string | null {
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/* ------------------------------------------------------------------ */
/*  Google Identity Services (GIS) helpers                            */
/* ------------------------------------------------------------------ */

let gisLoaded = false;

/** Dynamically load the GIS script from Google. */
export function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (gisLoaded && window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    if (document.getElementById("gis-script")) {
      // Script tag exists but may still be loading
      const check = setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          clearInterval(check);
          gisLoaded = true;
          resolve();
        }
      }, 100);
      return;
    }
    const script = document.createElement("script");
    script.id = "gis-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      gisLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Google Identity Services の読み込みに失敗しました"));
    document.head.appendChild(script);
  });
}

/** Request an OAuth2 access token via interactive popup. */
export function requestAccessToken(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: (response: { error?: string; access_token?: string }) => {
        if (response.error) {
          reject(new Error(`認証エラー: ${response.error}`));
        } else if (response.access_token) {
          resolve(response.access_token);
        } else {
          reject(new Error("アクセストークンを取得できませんでした"));
        }
      },
    });
    client.requestAccessToken();
  });
}

/* ------------------------------------------------------------------ */
/*  Google Drive upload                                               */
/* ------------------------------------------------------------------ */

/** Upload a PDF blob to a specific Google Drive folder. */
export async function uploadToGoogleDrive(
  blob: Blob,
  fileName: string,
  folderId: string,
  accessToken: string,
): Promise<void> {
  const metadata = {
    name: fileName,
    mimeType: "application/pdf",
    parents: [folderId],
  };

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
  );
  form.append("file", blob, fileName);

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const msg = (body as { error?: { message?: string } }).error?.message ?? `HTTP ${response.status}`;
    throw new Error(`アップロード失敗: ${msg}`);
  }
}
