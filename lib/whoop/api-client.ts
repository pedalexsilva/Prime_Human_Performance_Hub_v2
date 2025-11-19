// lib/whoop/api-client.ts

export async function fetchWhoopProfile(accessToken: string) {
  const res = await fetch("https://api.prod.whoop.com/developer/v1/user/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Whoop profile request failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchWhoopRecovery(accessToken: string) {
  const res = await fetch("https://api.prod.whoop.com/developer/v1/recovery", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Whoop recovery request failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchWhoopSleep(accessToken: string) {
  const res = await fetch("https://api.prod.whoop.com/developer/v1/sleep", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Whoop sleep request failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchWhoopCycle(accessToken: string) {
  const res = await fetch("https://api.prod.whoop.com/developer/v1/cycle", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Whoop cycle request failed: ${res.status}`);
  }
  return res.json();
}
