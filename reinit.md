# Full Environment Re-Initialization Procedure (Local Development)

This document outlines the mandatory steps for a full re-initialization of your **local development environment**. This process is specified in the StockSage Product Requirements Document (PRD section 6.9) and should be performed to ensure a clean slate when troubleshooting persistent issues or after significant configuration changes, before attempting a deployment.

## When to Trigger a Full Local Environment Re-Initialization

A full local environment re-initialization is mandatory under the following conditions (as per PRD):

*   **Major `next` version changes** (e.g., 13.x to 14.x, or 14.x to 15.x).
*   **Significant changes to `next.config.ts`**, especially webpack configurations or experimental flags.
*   **Adding, removing, or significantly version-changing core Genkit plugins** (e.g., `@genkit-ai/googleai`, `@genkit-ai/next`).
*   **Introducing or removing packages that heavily interact with Node.js internals** or have complex native dependencies (especially those that might touch `async_hooks` or affect module resolution).
*   **Switching Node.js versions** in the local development environment.
*   **Persistent, unexplainable build failures or runtime errors** locally after multiple simpler debugging attempts.

## Procedure for Full Local Environment Re-Initialization

Follow these 8 steps carefully in your local development environment:

1.  **Stop All Development Servers:**
    *   Ensure `next dev` (`npm run dev`), `genkit start` (`npm run genkit:watch` or `npm run genkit:dev`), and any other related processes are completely stopped.

2.  **Clean `node_modules`:**
    *   Delete the entire `node_modules` directory from your project root.
    *   Command: `rm -rf node_modules` (Linux/macOS) or delete manually via your file explorer (Windows).

3.  **Clean `package-lock.json`:**
    *   Delete the `package-lock.json` file from your project root.
    *   Command: `rm package-lock.json` (Linux/macOS) or delete manually (Windows).

4.  **Clean Next.js Cache:**
    *   Delete the `.next` directory from your project root.
    *   Command: `rm -rf .next` (Linux/macOS) or delete manually (Windows).

5.  **Clean Genkit Cache/State (If Applicable):**
    *   The current PRD does not specify a Genkit cache directory to clear. However, if Genkit creates local cache/state files (e.g., in a `.genkit` folder or similar in the future), those should also be cleared as a best practice.

6.  **Verify `package.json`:**
    *   Double-check your `package.json` to ensure it contains the desired and correct versions of all dependencies, especially for `next`, `genkit`, and related plugins. This is where you confirm you are targeting the intended versions for your current development or deployment effort.

7.  **Perform a Clean Install:**
    *   Run `npm install` from your project root. This will re-download all dependencies based on your `package.json` and generate a new `package-lock.json` file.
    *   *(Alternatively, if you had a trusted `package-lock.json` from a known-good state that you intended to restore, you would use `npm ci` after restoring that specific lock file. However, step 3 involves deleting the current one, so `npm install` is generally used here.)*

8.  **Build, Restart Development Servers, and Test Thoroughly (Locally):**
    *   **a. Attempt a Local Production Build:** Run `npm run build` from your project root. This will execute `next build` and can help catch build-specific errors before deploying. If this fails, address the errors.
    *   **b. Start Development Servers:** If the local production build succeeds (or for iterative development), start the Genkit development server: `npm run genkit:watch` (or `npm run genkit:dev`).
    *   **c. Start Next.js Development Server:** Start the Next.js development server: `npm run dev`.
    *   **d. Test Thoroughly:** Thoroughly test all application functionalities locally to ensure everything is working as expected before committing your changes and attempting another deployment to Firebase App Hosting.

By following these steps, you can help eliminate issues related to cached modules, inconsistent dependency lock files, or stale build artifacts in your **local development environment**.
