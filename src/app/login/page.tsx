import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="login-shell">
      <form action={login} className="login-card">
        <p className="eyebrow">EXECUTION OS</p>
        <h1>Welcome back.</h1>
        <p>Enter your owner password to continue.</p>
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
        {error && <p className="form-error">That password did not match.</p>}
        <button type="submit">Enter workspace</button>
      </form>
    </main>
  );
}
