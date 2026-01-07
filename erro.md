00:11:37.406 Running build in Washington, D.C., USA (East) – iad1
00:11:37.412 Build machine configuration: 2 cores, 8 GB
00:11:37.725 Cloning github.com/projeto-cirurgiao-marcelo/projeto-cirurgiao (Branch: main, Commit: 1abbd38)
00:11:38.695 Cloning completed: 969.000ms
00:11:39.951 Restored build cache from previous deployment (Bv14H9mCxPiHog9Pvhdkeh6YFwR2)
00:11:41.361 Running "vercel build"
00:11:41.780 Vercel CLI 50.1.5
00:11:42.105 Installing dependencies...
00:12:08.128 
00:12:08.129 up to date in 26s
00:12:08.130 
00:12:08.130 148 packages are looking for funding
00:12:08.130   run `npm fund` for details
00:12:08.168 Detected Next.js version: 15.3.6
00:12:08.174 Running "npm run build"
00:12:08.284 
00:12:08.285 > frontend-web@0.1.0 build
00:12:08.285 > next build
00:12:08.285 
00:12:09.052  ⚠ Invalid next.config.ts options detected: 
00:12:09.053  ⚠     Unrecognized key(s) in object: 'reactCompiler'
00:12:09.053  ⚠ See more info here: https://nextjs.org/docs/messages/invalid-next-config
00:12:09.116    ▲ Next.js 15.3.6
00:12:09.116 
00:12:09.136    Creating an optimized production build ...
00:12:17.752  ✓ Compiled successfully in 5.0s
00:12:17.755    Linting and checking validity of types ...
00:12:18.089  ⨯ ESLint: Cannot find module '/vercel/path0/frontend-web/node_modules/eslint-config-next/core-web-vitals' imported from /vercel/path0/frontend-web/eslint.config.mjs Did you mean to import "eslint-config-next/core-web-vitals.js"?
00:12:18.128 
00:12:18.128    We detected TypeScript in your project and reconfigured your tsconfig.json file for you.
00:12:18.129    The following mandatory changes were made to your tsconfig.json:
00:12:18.129 
00:12:18.129    	- jsx was set to preserve (next.js implements its own optimized jsx transform)
00:12:18.129 
00:12:23.717 Failed to compile.
00:12:23.717 
00:12:23.717 ./src/components/student/course-card-new.tsx:163:37
00:12:23.717 Type error: Property 'totalWatchTime' does not exist on type '{ totalVideos: number; watchedVideos: number; percentage: number; lastWatchedVideo?: { id: string; title: string; moduleTitle: string; } | undefined; }'.
00:12:23.718 
00:12:23.718 [0m [90m 161 |[39m               [33m<[39m[33mspan[39m[33m>[39m{progress[33m.[39mtotalVideos} aulas[33m<[39m[33m/[39m[33mspan[39m[33m>[39m[0m
00:12:23.718 [0m [90m 162 |[39m             [33m<[39m[33m/[39m[33mdiv[39m[33m>[39m[0m
00:12:23.718 [0m[31m[1m>[22m[39m[90m 163 |[39m             {isEnrolled [33m&&[39m progress[33m.[39mtotalWatchTime [33m>[39m [35m0[39m [33m&&[39m ([0m
00:12:23.718 [0m [90m     |[39m                                     [31m[1m^[22m[39m[0m
00:12:23.719 [0m [90m 164 |[39m               [33m<[39m[33mdiv[39m className[33m=[39m[32m"flex items-center gap-1"[39m[33m>[39m[0m
00:12:23.719 [0m [90m 165 |[39m                 [33m<[39m[33mClock[39m className[33m=[39m[32m"h-4 w-4"[39m [33m/[39m[33m>[39m[0m
00:12:23.719 [0m [90m 166 |[39m                 [33m<[39m[33mspan[39m[33m>[39m{[33mMath[39m[33m.[39mround(progress[33m.[39mtotalWatchTime [33m/[39m [35m60[39m)}min[33m<[39m[33m/[39m[33mspan[39m[33m>[39m[0m
00:12:23.750 Next.js build worker exited with code: 1 and signal: null
00:12:23.772 Error: Command "npm run build" exited with 1