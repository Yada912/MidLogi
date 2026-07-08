# Local Development Setup Guide

This guide covers how to set up the environment and run the project locally on your laptop, and expose it so you can test it on other devices (like your phone) connected to the same local network.

## Prerequisites

1. **Node.js**: Make sure you have Node.js installed (LTS version recommended).
2. **NPM**: Comes with Node.js.
3. **Supabase Project**: You need a Supabase project created in the [Supabase Dashboard](https://supabase.com/dashboard) because this app uses Supabase for the backend.

## 1. Environment Setup

To run this project, you need to set up your environment variables.

1. In the root of the project, create a new file named `.env.local` (this file is already safely ignored by Git).
2. Add your Supabase credentials to `.env.local`. You can find these in your Supabase Dashboard under **Project Settings -> API**.

Your `.env.local` should look like this:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_ANON_KEY_HERE
```

*(Note: There is an example file named `.env.local` already in the project, simply update the values with your actual Supabase keys).*

## 2. Install Dependencies

Open your terminal (PowerShell or Command Prompt) in the project root directory and run:

```bash
npm install
```

## 3. Run the Development Server on Local Network

We have updated the project configuration so that the app automatically broadcasts itself on your local network.

To start the server, run:

```bash
npm run dev
```

Once the server starts, you will see output similar to this in your terminal:

```text
  VITE vX.X.X  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.5:5173/
```

### Accessing the App:
- **On this Laptop**: Open your web browser and navigate to the `Local` address (e.g., `http://localhost:5173/`).
- **On your Phone or Other Devices**: Ensure your device is connected to the **same Wi-Fi network** as this laptop. Open the browser on your phone and enter the `Network` address shown in your terminal (e.g., `http://192.168.1.5:5173/`).
