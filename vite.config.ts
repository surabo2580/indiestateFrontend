import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://indieestate-uat-alb-2128030952.ap-south-1.elb.amazonaws.com",
    },
  },
});
