/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `npm run dev` blocks scripts requested from other hostnames. Allow the usual
  // HTTPS tunnels so friends can open a dev server through ngrok / cloudflared.
  allowedDevOrigins: ['*.ngrok-free.app', '*.ngrok-free.dev', '*.ngrok.app', '*.ngrok.io', '*.trycloudflare.com', '*.loca.lt'],
};
export default nextConfig;
