---
description: Deploy the application to Git and Vercel
---

1. Check git status to verify changes
// turbo
2. Add all changes to git
   `git add .`
3. Commit changes with a descriptive message
   `git commit -m "feat: Optimize dashboard charts, add year comparison, and clean up UI"`
4. Push changes to remote repository (this should trigger Vercel deployment)
   `git push`
5. (Optional) If manual Vercel deployment is needed
   `npx vercel --prod`
