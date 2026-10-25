export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateProductionConfig } = await import("./lib/config");
    try {
      validateProductionConfig(process.env);
    } catch (error) {
      console.error(
        error instanceof Error
          ? error.message
          : "Invalid production configuration.",
      );
      // Next.js catches hook failures; exit so the supervisor can detect failed startup.
      process.exit(1);
    }
  }
}
