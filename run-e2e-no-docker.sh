cd app
yarn build

cd ..

cd e2e
STRIPE_MOCK=1 VITE_STRIPE_MOCK=true npm run cypress:open