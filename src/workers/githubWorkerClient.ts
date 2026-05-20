export async function createWorkerOctokit(
  installationId: number
) {
  const [{ Octokit }, { createAppAuth }] = await Promise.all([
    import("@octokit/rest"),
    import("@octokit/auth-app")
  ]);

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: process.env.APP_ID!,
      privateKey: process.env.PRIVATE_KEY!,
      installationId
    }
  });
}