export async function refreshLdAdminBadge(invalidateNotifications: () => Promise<unknown>) {
  await invalidateNotifications();
}

export async function handleLdPdfSent(invalidateNotifications: () => Promise<unknown>) {
  await refreshLdAdminBadge(invalidateNotifications);
}
