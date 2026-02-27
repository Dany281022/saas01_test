# Day 5: Deploy Your SaaS to AWS App Runner — Self-Study Guide

---

## Introduction

### What is Day 5 About?

Day 5 marks a significant transition: you are moving your Healthcare Consultation Assistant from Vercel — a beginner-friendly hosting platform — to AWS (Amazon Web Services), the cloud infrastructure used by professional engineering teams worldwide. The goal is to package your entire application into a **Docker container** and deploy it using a service called **AWS App Runner**, which manages the heavy lifting of HTTPS, scaling, and uptime for you.

This is not just a deployment exercise. Along the way, you will learn genuinely professional practices: securing cloud accounts with least-privilege access, containerising applications for portable deployment, and setting up cost controls so you are never surprised by an unexpected bill.

### Summary of Major Steps

**Part 1 — AWS Account Setup**: You will create an AWS account (importantly, *not* the free-tier sandbox version), secure your root account with multi-factor authentication, configure budget alerts to guard against unexpected costs, create a limited-permission IAM user for daily work, and sign in as that user. This section establishes the security foundations that real engineering teams follow.

**Part 2 — Install Docker Desktop**: You will install Docker Desktop on your machine and verify it is working. Docker is the tool that lets you package your entire application — both the Python backend and the Next.js frontend — into a single, self-contained unit that runs identically anywhere.

**Part 3 — Prepare Your Application**: You will make targeted code changes to your Day 4 application to make it suitable for containerised deployment. This involves exporting Next.js as static HTML/JS files, updating the API call path, and creating a new backend server file (`server.py`) that can serve both the API and the static frontend from a single process.

**Part 4 — Create Docker Configuration**: You will write a `Dockerfile` — a recipe that describes exactly how to build your application's container image — and a `.dockerignore` file that tells Docker which files to leave out to keep the image small and safe.

**Part 5 — Build and Test Locally**: Before sending anything to AWS, you will build the Docker image on your own machine and run it as a container to confirm everything works correctly. This is an important step: if it works locally, it should work on AWS.

**Part 6 — Deploy to AWS**: You will push your Docker image to AWS's container storage service (ECR), then create an App Runner service that pulls from that storage and runs your application live on the internet with a real HTTPS URL.

**Parts 7–9 — Monitoring, Updates, and Cost Control**: You will learn how to read logs, debug common problems, push updates to your live application, and manage your AWS costs responsibly.

---

## Part 1: Create Your AWS Account

### Background: Why AWS Instead of Vercel?

Vercel is excellent for deploying Next.js applications quickly, but it has limitations: it is designed around a specific model where API routes run as short-lived serverless functions, and it abstracts away almost all infrastructure decisions. AWS gives you full control. More importantly, knowing how to deploy containers to AWS is an industry-standard skill — the vast majority of production applications at scale run on AWS or a comparable cloud platform (Azure, GCP). What you are learning here is directly applicable in professional roles.

---

### ⚠️ Critical Warning: Do NOT Select the AWS Free Tier Sandbox

When creating your account, AWS may offer a **"Free Tier"** sign-up option. **Do not choose this.** The free-tier sandbox environment does not include access to App Runner, which is the core service used today.

Instead, sign up for a standard account by entering your payment details. This does not mean you will be charged immediately — AWS applies free-tier credits to new accounts (student Jake C. confirmed that $120 in free credits still applied on a full account). The point is simply that you must be in a full account, not a restricted sandbox environment.

> **Why this matters**: Student Andy C. spent 24 hours debugging a cryptic error message — *"The AWS Access Key Id needs a subscription for the service"* — that turned out to be caused entirely by being signed up to the free-tier sandbox. The fix was to upgrade to a standard account. This is a well-known pitfall; do not fall into it.

---

### Step 1: Sign Up for AWS

1. Visit [aws.amazon.com](https://aws.amazon.com)
2. Click **Create an AWS Account**
3. Enter your email address and choose a strong password
4. Select **Personal** as the account type (appropriate for learning purposes)
5. Enter payment information — a credit card is required, but nothing will be charged until you use paid resources
6. Verify your phone number via SMS
7. Select **Basic Support – Free** (do not pay for a support plan)

You now have an **AWS root account**. Think of this like a master key to your entire AWS environment — it can do anything, including deleting all your resources or running up enormous costs. For this reason, you will almost never use the root account directly after this initial setup.

---

### Step 2: Secure Your Root Account with MFA

Multi-factor authentication (MFA) means that even if someone steals your password, they still cannot sign in without a second piece of proof (a time-based code from your phone). You must set this up on your root account.

1. Sign in to the AWS Console at [console.aws.amazon.com](https://console.aws.amazon.com)
2. Click your account name in the top-right corner → **Security credentials**
3. Under **Multi-factor authentication (MFA)**, click **Assign MFA device**
4. Name the device: `root-mfa`
5. Select **Authenticator app**
6. Scan the QR code using Google Authenticator or Authy on your phone
7. Enter two consecutive 6-digit codes from your authenticator app
8. Click **Add MFA**

After setting this up, sign out and sign back in again to confirm that MFA is working before moving on. If you cannot get back in, you need to fix this now while you still have options.

> **Note on ARNs**: While you are in the Security Credentials screen, you will notice a long identifier that looks like `arn:aws:iam::123456789012:root`. This is an **Amazon Resource Name (ARN)** — a unique identifier for any object in AWS. You will see ARNs constantly throughout this course. They always follow the pattern `arn:aws:service:region:account-id:resource`. You do not need to memorise this format; just recognise it when you see it.

---

### Step 3: Set Up Budget Alerts

> **This step is not optional.** Leaving AWS resources running without monitoring is how people accidentally receive bills for hundreds of dollars. Do this before you create anything that costs money.

AWS charges you based on what you use. With the configuration in this course, you should expect costs of roughly $5–6/month once your app is deployed. Budget alerts will email you as soon as your spending approaches thresholds you define.

1. In the AWS Console, use the search bar at the top and type **Billing**
2. Select **Billing and Cost Management**
3. In the left sidebar, scroll down and click **Budgets**
4. Click **Create budget**

The lecturer recommends creating **two budgets**:

**Budget 1 — Zero Spend Alert** (catches any spending at all):
- Select **Use a template (simplified)**
- Choose **Zero spend budget**
- Budget name: `zero-spend`
- Email recipients: your email address
- Click **Create budget**

This will notify you as soon as any charge exceeds $0.01. It is your first line of defence.

**Budget 2 — Monthly Ceiling** (your comfortable monthly limit):
- Click **Create budget** again
- Select **Use a template (simplified)**
- Choose **Monthly cost budget**
- Budget name: `monthly-check`
- Enter budgeted amount: whatever you are comfortable spending this month (e.g. `5` USD)
- Email recipients: your email address
- Click **Create budget**

AWS will automatically email you when your actual spend reaches 85% of this amount, 100% of this amount, and when your *forecasted* spend is predicted to reach 100%. That means up to three separate warning emails per budget.

> **If you ever hit your ceiling**: Go to App Runner → select your service → **Actions** → **Pause service**. This stops the service from running and billing you while you investigate.

---

### Step 4: Create an IAM User for Daily Work

**IAM** (Identity and Access Management) is AWS's system for controlling who can do what within your account. The root account has unlimited power — that makes it dangerous for everyday use. Instead, you will create a separate user called `aiengineer` with only the permissions actually needed for this course.

This is standard professional practice: even in real teams, engineers never use root accounts. They use tightly scoped IAM users or roles.

1. In the AWS Console search bar, type **IAM** and select the IAM service
2. In the left sidebar, click **Users**
3. Click **Create user** (orange button)
4. Username: `aiengineer`
5. Check ✅ **Provide user access to the AWS Management Console**
6. Select **I want to create an IAM user**
7. Choose **Custom password** and set a strong password you will remember
8. Uncheck ⬜ **Users must create a new password at next sign-in** (since you are setting it now)
9. Click **Next** — but do **not** attach permissions yet; you will do this via a group

---

### Step 5: Create a User Group with Permissions

Rather than attaching permissions directly to your user, you will create a **user group** — a named collection of permissions that can be applied to one or many users. This is the correct, scalable way to manage access in AWS.

1. On the permissions page, select **Add user to group**
2. Click **Create group**
3. Group name: `BroadAIEngineerAccess`
4. In the **Permissions policies** search box, find and tick each of the following policies one at a time:
   - `AWSAppRunnerFullAccess` — allows deploying and managing App Runner services
   - `AmazonEC2ContainerRegistryFullAccess` — allows pushing Docker images to ECR
   - `CloudWatchLogsFullAccess` — allows reading application logs
   - `IAMUserChangePassword` — allows the user to manage their own password
   - `IAMFullAccess` — **required** for App Runner to create service roles automatically; without this you will encounter permission errors when App Runner tries to set up its own access to ECR

> **Tip on searching policies**: The policy search box works one policy at a time. Type the policy name, tick its checkbox, then type the next one. The ticked policies accumulate — you do not need to press any button between them until you are ready to create the group.

5. Click **Create user group**
6. Back on the permissions page, select the `BroadAIEngineerAccess` group (it should be pre-checked)
7. Click **Next** → **Create user**
8. **Important**: On the confirmation screen, click **Download .csv file** and save it somewhere secure. This file contains your sign-in URL and credentials.

> **On permission errors throughout the course**: You may encounter "Access Denied" errors as you work through later days. The solution is almost always to return here (as the root user) and attach an additional policy to the `BroadAIEngineerAccess` group. This is a very common reality of working with AWS.

> **A note on "full access" policies**: Giving `FullAccess` policies is admittedly broader than strictly necessary. Production environments use much more granular permissions (e.g. allowing only `ecr:PutImage` rather than full ECR access). For a learning course, this level of granularity is appropriate — just bear in mind that tightening permissions is something real teams invest significant effort into.

---

### Step 6: Sign In as Your IAM User

1. Sign out from your root account
2. Open the sign-in URL from your downloaded CSV file — it looks like: `https://123456789012.signin.aws.amazon.com/console`
3. Sign in with:
   - Username: `aiengineer`
   - Password: (the password you created)

✅ **Checkpoint**: The top-right corner of the AWS Console should show `aiengineer @ YOUR-ACCOUNT-ID`.

> **Important — Regions**: Notice the dropdown near the top-right that shows a region name (e.g. `US East (N. Virginia)` or `eu-west-1`). AWS is organised into geographic **regions**, and each region is effectively an independent cloud installation with separate resources. Choose a region close to you for best performance, and be consistent — always use the same region throughout this course. The region codes follow the pattern `us-east-1`, `eu-west-1`, `ap-southeast-1`, etc. Typos in region names (even a missing hyphen) can cause obscure errors, so be careful when typing them.

> **Expected "Access Denied" messages**: As the `aiengineer` user, you will see permission errors on some Console pages (e.g. Billing). This is normal and correct — the IAM user only has access to the services you granted it. To check billing, you must sign in as your root user.

---

## Part 2: Install Docker Desktop

### What is Docker and Why Do We Need It?

A key problem in software deployment is the classic "it works on my machine" scenario: your application runs fine locally but breaks in production because the production environment has different software versions, different operating system configurations, or missing dependencies.

**Docker** solves this by packaging your application together with its entire runtime environment — the operating system base layer, Python interpreter, installed packages, and your code — into a single portable unit called a **container image**. When you run that image, whether on your laptop, your colleague's machine, or an AWS server in Ireland, it behaves identically. The image is defined by a **Dockerfile**, which is a plain-text recipe that describes every step needed to build the environment.

Two key terms to keep straight:
- **Image**: The blueprint (like a class in programming, or a cookie cutter). Static, read-only.
- **Container**: A running instance of an image (like an object, or an actual cookie). Each container is isolated from others.

---

### Step 1: Install Docker Desktop

1. Visit [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
2. Download the correct version for your system:
   - **Mac**: Choose Apple Silicon (M1/M2/M3) or Intel depending on your processor
   - **Windows**: Download for Windows (requires Windows 10 or 11)
3. Run the installer
4. **Windows users**: Docker Desktop will install **WSL2** (Windows Subsystem for Linux) — a lightweight Linux environment that Docker requires to run on Windows. Accept all prompts.
5. Start Docker Desktop
6. You may need to restart your computer after installation

---

### Step 2: Verify Docker Works

Open Terminal (Mac/Linux) or PowerShell (Windows) and run:

```bash
docker --version
```

You should see a version number — Docker 27 or later is current as of this writing. Any recent version will work fine.

Now test that Docker is actually running:

```bash
docker run hello-world
```

Docker will download a tiny test image and run it. You should see a message starting with **"Hello from Docker!"** followed by an explanation of what just happened (Docker pulled the image from Docker Hub, created a container, and ran it). If you see this, Docker is working correctly.

✅ **Checkpoint**: The Docker Desktop icon (a whale) should be visible in your system tray (Windows) or menu bar (Mac).

---

## Part 3: Prepare Your Application

### The Architecture Change

On Vercel, your Next.js application ran on Vercel's servers and its API routes ran as short-lived serverless functions. For AWS deployment, you are switching to a different model: **everything runs in a single Docker container**.

Concretely, this means:
- The Next.js frontend is **exported as static files** (plain HTML, CSS, and JavaScript) during the build process, rather than being rendered dynamically on demand
- The FastAPI Python backend serves both the **API** and the **static frontend files**
- This single container is what App Runner will run

This is a very common architecture for simpler applications. The trade-off is that you lose some advanced Next.js features that require a running Node.js server (like server-side rendering), but for an application like this one, static export is entirely appropriate.

> **Preserving your Vercel version**: Before making changes, consider copying your project folder and saving it as a backup (e.g. `saas-vercel/`). Since the project is not pushed to Git, this is the only way to preserve the Vercel version if you want to refer back to it.

---

### Step 1: Review Your Project Structure

Your project should look like this before making any changes:

```
saas/
├── pages/                  # Next.js Pages Router
├── styles/                 # CSS styles
├── api/                    # FastAPI backend
├── public/                 # Static assets
├── node_modules/          
├── .env.local             # Your secrets (never commit this!)
├── .gitignore
├── package.json
├── requirements.txt
├── next.config.ts
└── tsconfig.json
```

---

### Step 2: Convert the Frontend to Static Export

Update `next.config.ts` to tell Next.js to produce static output:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',       // Tells Next.js to export static HTML/JS/CSS files
  images: {
    unoptimized: true     // Required for static export (disables Next.js image optimisation)
  }
};

export default nextConfig;
```

**What this does**: When you run `npm run build`, Next.js will now generate a folder called `out/` containing plain static files (HTML, JavaScript, CSS) that any web server can serve — including your Python FastAPI backend.

**Note on authentication with static export**: With the Pages Router, Clerk's authentication is handled entirely client-side via components like `<Protect>` and `<SignedIn>`. These components work correctly with static exports because they run in the browser, not on a server. You do not need middleware files with this approach.

---

### Step 3: Update the Frontend API Call

The frontend currently calls `/api` to reach the backend. Since both frontend and backend will now run on the same server, you need to update this to the full path `/api/consultation`.

In `pages/product.tsx`, find the `fetchEventSource` call and update it:

```typescript
// Before (Vercel setup):
await fetchEventSource('/api', {

// After (AWS setup):
await fetchEventSource('/api/consultation', {
```

This change is necessary because on Vercel, Next.js's built-in routing intercepted calls to `/api`. In the new setup, FastAPI handles routing directly, and the endpoint is defined as `/api/consultation`.

---

### Step 4: Create the New Backend Server

Create a new file `api/server.py`. This replaces the previous `index.py` as the main entry point for the backend. Your old `index.py` can remain for reference.

```python
import os
from pathlib import Path
from fastapi import FastAPI, Depends
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi_clerk_auth import ClerkConfig, ClerkHTTPBearer, HTTPAuthorizationCredentials
from openai import OpenAI

app = FastAPI()

# CORS middleware: allows the frontend (running in the browser) to call this backend.
# allow_origins=["*"] permits requests from any origin — fine for learning,
# but in production you would restrict this to your actual domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Clerk authentication: validates the JWT token sent by the frontend
clerk_config = ClerkConfig(jwks_url=os.getenv("CLERK_JWKS_URL"))
clerk_guard = ClerkHTTPBearer(clerk_config)

class Visit(BaseModel):
    patient_name: str
    date_of_visit: str
    notes: str

system_prompt = """
You are provided with notes written by a doctor from a patient's visit.
Your job is to summarize the visit for the doctor and provide an email.
Reply with exactly three sections with the headings:
### Summary of visit for the doctor's records
### Next steps for the doctor
### Draft of email to patient in patient-friendly language
"""

def user_prompt_for(visit: Visit) -> str:
    return f"""Create the summary, next steps and draft email for:
Patient Name: {visit.patient_name}
Date of Visit: {visit.date_of_visit}
Notes:
{visit.notes}"""

@app.post("/api/consultation")
def consultation_summary(
    visit: Visit,
    creds: HTTPAuthorizationCredentials = Depends(clerk_guard),
):
    user_id = creds.decoded["sub"]  # The authenticated user's ID from the JWT token
    client = OpenAI()
    
    user_prompt = user_prompt_for(visit)
    prompt = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    
    # ⚠️ CORRECTION: The original script uses "gpt-5-nano", which is not a valid
    # OpenAI model name. Use a real model such as "gpt-4o-mini" (fast and cost-effective)
    # or "gpt-4o" (more capable). Check the OpenAI documentation for the latest
    # available models if you are unsure.
    stream = client.chat.completions.create(
        model="gpt-4o-mini",   # Corrected from the original "gpt-5-nano"
        messages=prompt,
        stream=True,
    )
    
    def event_stream():
        for chunk in stream:
            text = chunk.choices[0].delta.content
            if text:
                lines = text.split("\n")
                for line in lines[:-1]:
                    yield f"data: {line}\n\n"
                    yield "data:  \n"
                yield f"data: {lines[-1]}\n\n"
    
    return StreamingResponse(event_stream(), media_type="text/event-stream")

@app.get("/health")
def health_check():
    """
    Health check endpoint for AWS App Runner.
    App Runner will call this URL periodically to confirm the application is alive.
    If this endpoint stops responding, App Runner marks the service as unhealthy.
    """
    return {"status": "healthy"}

# Serve the Next.js static export — this must be registered LAST.
# Any route not matched by the API endpoints above will fall through to here.
static_path = Path("static")
if static_path.exists():
    @app.get("/")
    async def serve_root():
        return FileResponse(static_path / "index.html")
    
    app.mount("/", StaticFiles(directory="static", html=True), name="static")
```

**Key things to understand in this file**:

- **CORS middleware**: CORS (Cross-Origin Resource Sharing) is a browser security mechanism. When your static frontend (loaded from one URL) tries to call your backend (potentially at the same URL, but the browser treats them as separate origins), the browser checks whether the backend permits this. The `allow_origins=["*"]` setting permits all origins. In a production application you would restrict this to your specific domain.

- **The `/health` endpoint**: A simple route that returns `{"status": "healthy"}`. App Runner will call this endpoint every 20 seconds as a heartbeat check. If it fails consistently, App Runner will attempt to restart the container. Every well-designed deployment has a health check.

- **Serving static files**: The `app.mount("/", StaticFiles(...))` line tells FastAPI to serve the contents of the `static/` folder (which will contain your built Next.js output) for any URL that is not matched by an API route. This is how one Python server can act as both an API server and a web server simultaneously. **It must be registered last** — if it were registered first, it would intercept API calls before they reach the API routes.

- **Model correction**: The original script specifies `model="gpt-5-nano"`, which is not a valid OpenAI model name. This should be corrected to a real model such as `"gpt-4o-mini"` (a fast, affordable model well-suited for this use case). Check the OpenAI documentation for the latest available models.

---

### Step 5: Create the Environment File for AWS

Create a `.env` file in your project root (this is a new file separate from `.env.local`):

```bash
# Copy these values from your existing .env.local file:
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_JWKS_URL=https://...
OPENAI_API_KEY=sk-...

# Add these two new values for AWS deployment:
DEFAULT_AWS_REGION=us-east-1         # Replace with your chosen region (e.g. eu-west-1)
AWS_ACCOUNT_ID=123456789012          # Replace with your 12-digit AWS Account ID
```

**To find your AWS Account ID**: In the AWS Console, click on your username in the top-right corner. Your 12-digit account ID is displayed in the dropdown. Copy it carefully.

**To find your region code**: Look at the region dropdown in the top-right of the AWS Console. Click it — the region codes (like `us-east-1`, `eu-west-1`, `ap-southeast-1`) are shown next to each region name. Pick the region closest to you geographically for best performance.

**Important**: Add `.env` to your `.gitignore` file immediately. This file contains sensitive API keys and should never be committed to version control.

---

## Part 4: Create Docker Configuration

### Step 1: Create the Dockerfile

Create a file called `Dockerfile` (no extension) in your project root:

```dockerfile
# ============================================================
# Stage 1: Build the Next.js static files
# ============================================================
# We start from an official Node.js 22 image. This is a
# "build stage" — we only use it to produce the static files,
# not in the final container.
FROM node:22-alpine AS frontend-builder

WORKDIR /app

# Copy package files first. Docker caches each instruction as a layer.
# By copying package files before the rest of the code, Docker can
# reuse the npm install layer on rebuilds if your dependencies haven't changed.
COPY package*.json ./
RUN npm ci

# Copy all remaining frontend files
COPY . .

# Receive the Clerk publishable key as a build argument.
# This key starts with "pk_" and is intentionally public-facing —
# it is safe to include it here. Docker may warn about "secrets in ARG/ENV",
# but this warning can be safely ignored for public keys.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

# Build the Next.js app. Because next.config.ts has output: 'export',
# this produces a folder called 'out/' containing plain HTML/CSS/JS files.
RUN npm run build

# ============================================================
# Stage 2: Create the final production container
# ============================================================
# We start fresh from a minimal Python 3.12 image.
# The Node.js build environment from Stage 1 is NOT included here —
# this keeps the final image small and the attack surface minimal.
FROM python:3.12-slim

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the FastAPI server
COPY api/server.py .

# Copy the static files produced in Stage 1 into a 'static/' folder.
# FastAPI's server.py expects to find static files at this path.
COPY --from=frontend-builder /app/out ./static

# Health check: Docker itself will periodically call /health to
# verify the container is alive. This is separate from App Runner's
# health check but serves the same purpose.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Document that the container listens on port 8000
EXPOSE 8000

# Start the FastAPI application using Uvicorn, an ASGI web server.
# --host 0.0.0.0 makes it listen on all network interfaces (required in containers).
# --port 8000 matches the EXPOSE instruction above.
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Understanding the multi-stage build**: This Dockerfile uses two `FROM` instructions, creating two stages. The first stage (named `frontend-builder`) installs Node.js and builds the static frontend. The second stage starts fresh with just Python, then copies only the finished static files from Stage 1. The end result is a lean Python container that contains the built frontend but none of the Node.js tooling that was needed to produce it. Multi-stage builds are a Docker best practice: they keep image sizes small and avoid including build tools in production images.

---

### Step 2: Create .dockerignore

Create a `.dockerignore` file in your project root:

```
node_modules
.next
.env
.env.local
.git
.gitignore
README.md
.DS_Store
*.log
.vercel
dist
build
```

**Why this matters**: Without `.dockerignore`, Docker would copy `node_modules` (potentially hundreds of megabytes) into the build context when you run `docker build`. The `.dockerignore` file works exactly like `.gitignore` — it tells Docker which files and folders to exclude. The entries above exclude large, unnecessary, or sensitive items (note that `.env` and `.env.local` are excluded because secrets must not be baked into the image; they are passed in at runtime instead).

---

## Part 5: Build and Test Locally

Testing locally before deploying to AWS saves significant time. A problem caught here takes seconds to fix; the same problem discovered after a failed AWS deployment could take 10–15 minutes per attempt (since each deployment involves rebuilding and pushing the Docker image).

### Step 1: Load Environment Variables into Your Terminal

Your `.env` file contains variables that need to be available in your terminal session for the build and run commands.

**Mac/Linux** (Terminal):
```bash
export $(cat .env | grep -v '^#' | xargs)
```

**Windows** (PowerShell):
```powershell
Get-Content .env | ForEach-Object {
    if ($_ -match '^(.+?)=(.+)$') {
        [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
    }
}
```

**What this does**: It reads each line of your `.env` file and sets it as an environment variable in the current terminal session. The `grep -v '^#'` part (Mac/Linux) skips comment lines. These variables are now available to Docker commands and scripts in this session.

---

### Step 2: Build the Docker Image

**Mac/Linux**:
```bash
docker build \
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" \
  -t consultation-app .
```

**Windows PowerShell**:
```powershell
docker build `
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$env:NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" `
  -t consultation-app .
```

**Breaking down this command**:
- `docker build` — invokes the Docker build process using the `Dockerfile` in the current directory (`.`)
- `--build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="..."` — passes the Clerk public key into the build process as a build argument (it is needed by Next.js during the static export step)
- `-t consultation-app` — tags (names) the resulting image as `consultation-app`

This will take 2–3 minutes the first time. You will see Docker execute each instruction in the Dockerfile, downloading base images, installing packages, and running the Next.js build. Subsequent builds will be much faster because Docker caches unchanged layers.

**Expected warnings**: You will see two warnings about using a secret in an ARG/ENV. These can be safely ignored — the Clerk publishable key is intentionally public (it is designed for client-side use and starts with `pk_`).

---

### Step 3: Run the Container Locally

**Mac/Linux**:
```bash
docker run -p 8000:8000 \
  -e CLERK_SECRET_KEY="$CLERK_SECRET_KEY" \
  -e CLERK_JWKS_URL="$CLERK_JWKS_URL" \
  -e OPENAI_API_KEY="$OPENAI_API_KEY" \
  consultation-app
```

**Windows PowerShell**:
```powershell
docker run -p 8000:8000 `
  -e CLERK_SECRET_KEY="$env:CLERK_SECRET_KEY" `
  -e CLERK_JWKS_URL="$env:CLERK_JWKS_URL" `
  -e OPENAI_API_KEY="$env:OPENAI_API_KEY" `
  consultation-app
```

**Breaking down this command**:
- `docker run` — creates and starts a container from the named image
- `-p 8000:8000` — maps port 8000 on your machine to port 8000 inside the container. The format is `host-port:container-port`.
- `-e KEY="value"` — sets environment variables inside the running container. Notice that `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is *not* passed here — it was already baked into the static files during the build step.

---

### Step 4: Test Your Application

1. Open a browser and go to `http://localhost:8000`
2. Sign in with your Clerk account
3. Test the consultation form end-to-end
4. Verify the streaming response appears correctly

To stop the container, press `Ctrl+C` in the terminal.

✅ **Checkpoint**: The application should behave identically to the Vercel version. If it does not, debug it now — do not proceed to AWS deployment until it works locally.

---

## Part 6: Deploy to AWS

### Step 1: Create an ECR Repository

ECR (Elastic Container Registry) is AWS's private registry for Docker images — similar in concept to GitHub, but for container images rather than code. You need to push your image here before App Runner can use it.

1. In the AWS Console, search for **ECR** and open **Elastic Container Registry**
2. **Confirm you are in the correct region** (top-right dropdown). It must match your `DEFAULT_AWS_REGION` in `.env`.
3. Click **Create repository**
4. Settings:
   - Visibility: **Private**
   - Repository name: `consultation-app` — this must match exactly, as it is referenced in later commands
   - Leave all other settings as default
5. Click **Create repository**
6. Verify: you should see `consultation-app` appear in the repository list

---

### Step 2: Set Up the AWS CLI

The AWS CLI (Command Line Interface) allows you to interact with AWS services from your terminal. You need it to authenticate Docker to ECR and push your image.

#### Create Access Keys

Access keys are a pair of credentials (an Access Key ID and a Secret Access Key) that the CLI uses to authenticate as your IAM user.

1. In the AWS Console, go to **IAM** → **Users** → click on `aiengineer`
2. Click the **Security credentials** tab
3. Scroll to **Access keys** and click **Create access key**
4. Select **Command Line Interface (CLI)**
5. Tick the confirmation checkbox → **Next**
6. Description: `Docker push access`
7. Click **Create access key**
8. **Critical**: Copy or download both values immediately:
   - Access Key ID (looks like: `AKIAIOSFODNN7EXAMPLE`)
   - Secret Access Key (looks like: `wJalrXUtnFEMI/K7MDENG/bPxRfiCY`)

   These will not be shown again after you leave this page.

9. Click **Done**

#### Install and Configure the AWS CLI

**Mac**:
```bash
brew install awscli
```
**Windows**: Download the installer from [aws.amazon.com/cli](https://aws.amazon.com/cli/)

Once installed, run:
```bash
aws configure
```

Enter the following when prompted:
- **AWS Access Key ID**: paste your access key ID
- **AWS Secret Access Key**: paste your secret access key
- **Default region name**: your chosen region code (e.g. `us-east-1`, `eu-west-1`)
- **Default output format**: `json`

> **Region name format**: Be careful with the hyphen-separated format: `us-east-1`, not `useast1` or `us east 1`. A single missing hyphen can cause cryptic errors.

---

### Step 3: Push the Image to ECR

Make sure your environment variables are still loaded (re-run the export command from Part 5, Step 1 if you have opened a new terminal window since then).

**Mac/Linux**:
```bash
# Step 1: Authenticate Docker to ECR
# This command gets a temporary password from AWS and passes it to Docker.
# You will not be prompted for anything — it is fully automatic.
aws ecr get-login-password --region $DEFAULT_AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$DEFAULT_AWS_REGION.amazonaws.com

# Step 2: Rebuild the image specifically for Linux/AMD64
# IMPORTANT: If you are on Apple Silicon (M1/M2/M3), the image you built
# earlier was for ARM architecture and will NOT run on AWS servers (which use
# AMD64/x86-64). The --platform flag forces a cross-platform build.
# Even on Intel Macs and Windows, specifying this flag is a good habit.
docker build \
  --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" \
  -t consultation-app .

# Step 3: Tag the image for ECR
# Tagging creates an alias pointing to the ECR repository URL.
docker tag consultation-app:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$DEFAULT_AWS_REGION.amazonaws.com/consultation-app:latest

# Step 4: Push to ECR
docker push \
  $AWS_ACCOUNT_ID.dkr.ecr.$DEFAULT_AWS_REGION.amazonaws.com/consultation-app:latest
```

**Windows PowerShell**:
```powershell
# Step 1: Authenticate Docker to ECR
aws ecr get-login-password --region $env:DEFAULT_AWS_REGION | `
  docker login --username AWS --password-stdin `
  "$env:AWS_ACCOUNT_ID.dkr.ecr.$env:DEFAULT_AWS_REGION.amazonaws.com"

# Step 2: Rebuild for Linux/AMD64
docker build `
  --platform linux/amd64 `
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$env:NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" `
  -t consultation-app .

# Step 3: Tag for ECR
docker tag consultation-app:latest `
  "$env:AWS_ACCOUNT_ID.dkr.ecr.$env:DEFAULT_AWS_REGION.amazonaws.com/consultation-app:latest"

# Step 4: Push to ECR
docker push `
  "$env:AWS_ACCOUNT_ID.dkr.ecr.$env:DEFAULT_AWS_REGION.amazonaws.com/consultation-app:latest"
```

The push will take 2–5 minutes depending on your internet connection.

✅ **Checkpoint**: In the ECR console, click on your `consultation-app` repository — you should see an image tagged `latest`.

---

## Part 7: Create the App Runner Service

App Runner is the AWS service that takes your container image, runs it, and exposes it to the internet with a real HTTPS URL. It automatically handles load balancing and TLS certificates, and it keeps your container running.

### Step 1: Open App Runner

1. In the AWS Console, search for **App Runner**
2. Click **Create service**

---

### Step 2: Configure the Source

1. Under **Source**:
   - Repository type: **Container registry**
   - Provider: **Amazon ECR**
2. Click **Browse**
3. Select the `consultation-app` repository → select the `latest` tag → **Continue**
4. Under **Deployment settings**:
   - Deployment trigger: **Manual** (you will trigger deployments yourself, which prevents automatic costs each time you push)
   - ECR access role: **Create new service role** (App Runner needs permission to pull from ECR; this creates the role automatically)
5. Click **Next**

---

### Step 3: Configure the Service

1. **Service name**: `consultation-app-service`

2. **Virtual CPU and Memory**:
   - vCPU: `0.25 vCPU`
   - Memory: `0.5 GB`
   
   This is the smallest available configuration and is sufficient for a low-traffic learning application.

3. **Environment variables** — click **Add environment variable** for each of the following:
   - Key: `CLERK_SECRET_KEY` → Value: paste from your `.env` file
   - Key: `CLERK_JWKS_URL` → Value: paste from your `.env` file
   - Key: `OPENAI_API_KEY` → Value: paste from your `.env` file
   
   > **Why not `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`?** This key was baked into the static files during the Docker build step. It does not need to be passed at runtime.

4. **Port**: `8000` — this must match the port your FastAPI server listens on

5. **Auto scaling**:
   - Click to configure a new scaling policy
   - Give it a name (e.g. `basic`)
   - Maximum concurrent requests: `10`
   - Minimum number of instances: `1`
   - Maximum number of instances: `1`
   
   Setting both min and max to 1 ensures only one instance runs at a time, keeping costs predictable.

6. Click **Next**

---

### Step 4: Configure the Health Check

App Runner will periodically call your `/health` endpoint to confirm the application is alive. If health checks fail consistently, App Runner will attempt to restart the container.

1. **Health check configuration**:
   - Protocol: **HTTP**
   - Path: `/health`
   - Interval: `20` seconds
   - Timeout: `5` seconds
   - Healthy threshold: `2` (two consecutive successes to be considered healthy)
   - Unhealthy threshold: `5` (five consecutive failures to be considered unhealthy)

2. Click **Next**

---

### Step 5: Review and Deploy

1. Review all settings carefully
2. Click **Create & deploy**
3. Wait 5–10 minutes while watching the **Events** log at the bottom of the page. You will see App Runner pulling the image, starting the container, and running health checks.
4. Status will change from **"Operation in progress"** to **"Running"**

✅ **Checkpoint**: The service shows **"Running"** with a green indicator.

---

### Step 6: Access Your Application

1. Click the **Default domain** URL (it looks like: `abc123.YOUR-REGION.awsapprunner.com`)
2. Your application should load with HTTPS enabled automatically
3. Test all functionality:
   - Sign in with Clerk
   - Create a consultation summary
   - Sign out

🎉 **Congratulations!** Your Healthcare Consultation Assistant is running on AWS, deployed in a Docker container, secured with Clerk authentication, backed by OpenAI, and accessible to the internet.

---

## Part 8: Monitoring and Debugging

### Viewing Logs

Logs are your primary tool for diagnosing problems in deployed applications.

1. In your App Runner service, click the **Logs** tab
2. Two types of logs are available:
   - **Application logs**: output from your Python server (print statements, errors, request logs)
   - **System logs**: infrastructure-level events (deployment stages, health check results)
3. Click **View in CloudWatch** for full-text search and time-range filtering

### Common Issues and Solutions

**Service shows "Unhealthy" status**:
- Check application logs for Python errors or import failures
- Verify all three environment variables (`CLERK_SECRET_KEY`, `CLERK_JWKS_URL`, `OPENAI_API_KEY`) are set correctly
- Confirm the health check path is `/health` (not `/health/` or anything else)

**"Authentication failed" errors**:
- Double-check the Clerk environment variables
- Verify the JWKS URL is correct (find it in your Clerk dashboard)
- Check CloudWatch logs for the specific error message from the `fastapi_clerk_auth` library

**Page not loading / "Exec format error"**:
- You may have forgotten the `--platform linux/amd64` flag when building for ECR. Rebuild and push with the flag.

**"Unauthorized" when pushing to ECR**:
```bash
# Re-authenticate Docker to ECR:
aws ecr get-login-password --region YOUR-REGION | \
  docker login --username AWS --password-stdin \
  YOUR-ACCOUNT-ID.dkr.ecr.YOUR-REGION.amazonaws.com
```

**"Access Denied" errors**:
- Sign in as the root user and add the missing policy to the `BroadAIEngineerAccess` group. This is a very common occurrence when working with AWS.

---

## Part 9: Updating Your Application

When you make code changes and want to deploy them to AWS, the process is: rebuild → push → trigger a new deployment.

### Step 1: Rebuild and Push

**Mac/Linux**:
```bash
# Load environment variables if not already loaded
export $(cat .env | grep -v '^#' | xargs)

# Rebuild with platform flag (required every time you push to AWS)
docker build \
  --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" \
  -t consultation-app .

# Tag for ECR
docker tag consultation-app:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$DEFAULT_AWS_REGION.amazonaws.com/consultation-app:latest

# Push to ECR
docker push \
  $AWS_ACCOUNT_ID.dkr.ecr.$DEFAULT_AWS_REGION.amazonaws.com/consultation-app:latest
```

**Windows PowerShell**:
```powershell
docker build `
  --platform linux/amd64 `
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$env:NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" `
  -t consultation-app .

docker tag consultation-app:latest `
  "$env:AWS_ACCOUNT_ID.dkr.ecr.$env:DEFAULT_AWS_REGION.amazonaws.com/consultation-app:latest"

docker push `
  "$env:AWS_ACCOUNT_ID.dkr.ecr.$env:DEFAULT_AWS_REGION.amazonaws.com/consultation-app:latest"
```

### Step 2: Trigger Deployment in App Runner

1. Open the App Runner console
2. Select your `consultation-app-service`
3. Click **Deploy**
4. Wait for the deployment to complete (watch the Events log)

---

## Cost Management

### What This Costs

With the configuration used in this guide (one instance running continuously):
- App Runner: approximately $0.007/hour ≈ **$5/month** for continuous operation
- ECR: approximately $0.10/GB/month for image storage
- **Total: approximately $5–6/month**

App Runner requires at least one instance running at all times, so there is a minimum ongoing cost while the service is active.

### How to Save Money

- **Pause when not in use**: In App Runner → select your service → **Actions** → **Pause service**. This stops the instance and billing.
- **Use free credits**: New AWS accounts receive credits that may cover several months of this usage level.
- **Monitor your budgets**: Check your email alerts and visit the Billing dashboard regularly.
- **Clean up ECR**: Delete old image versions from ECR (you are charged per GB stored).

### Architecture Comparison: Vercel vs AWS

| Aspect | Vercel | AWS (App Runner) |
|---|---|---|
| Frontend | Next.js with SSR support | Static export only (in this setup) |
| Backend | Serverless functions per route | Single long-running container |
| Deployment | Automatic from Git push | Manual (or automated via CI/CD) |
| Configuration | Near-zero setup | Significant but educational setup |
| Cost | Free tier available | ~$5/month minimum once deployed |
| Control | Limited | Full infrastructure control |

Both are valid production approaches. Vercel optimises for developer speed; AWS offers flexibility and is the standard for larger or more complex systems.

---

## What You Have Accomplished

By completing Day 5, you have:

- ✅ Created a production-grade AWS account following security best practices
- ✅ Set up IAM with a least-privilege user and group (a real DevOps practice)
- ✅ Configured cost controls to protect against unexpected bills
- ✅ Containerised a full-stack application using a multi-stage Dockerfile
- ✅ Deployed a live, HTTPS application to AWS App Runner
- ✅ Learned how to push updates and monitor your application in production

These skills — Docker, AWS IAM, container registries, and App Runner — translate directly to professional roles. The patterns you have used here are the same ones engineering teams use to deploy at scale.

---

## Further Reading and Resources

- [AWS App Runner Documentation](https://docs.aws.amazon.com/apprunner/)
- [Docker Documentation](https://docs.docker.com/)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [AWS Free Tier Details](https://aws.amazon.com/free/)
- [AWS Cost Management Console](https://aws.amazon.com/aws-cost-management/)
- [OpenAI Available Models](https://platform.openai.com/docs/models)

---

> **Remember**: Always pause or delete your App Runner service when you are not actively using it, and check your billing dashboard regularly. Happy deploying! 🚀
