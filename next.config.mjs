/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Allowed development origins (IPs/domains for local network access)
  // Set ALLOWED_ORIGINS in .env.local: "192.168.100.5,localhost:3000"
  allowedDevOrigins: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
    : ['192.168.100.5', 'localhost:3000'],
};

export default nextConfig;
