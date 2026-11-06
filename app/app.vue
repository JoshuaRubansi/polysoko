<script setup lang="ts">
import AdminDashboard from './AdminDashboard.vue'
import LandingPage from './LandingPage.vue'

type SessionUser = { id: string, name: string, email: string, role: 'user' | 'admin' }

const showAuth = ref(false)
const showStorefront = ref(false)
const isCheckingSession = ref(true)
const currentUser = ref<SessionUser | null>(null)
const authMessage = ref('')
const mode = ref<'login' | 'register'>('login')
const name = ref('')
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error' | ''>('')

onMounted(async () => {
  try {
    const response = await $fetch<{ user: SessionUser | null }>('/api/auth/me')
    currentUser.value = response.user
  } catch (error: unknown) {
    authMessage.value = getErrorMessage(error, 'We could not verify your session. Please sign in again.')
  } finally {
    isCheckingSession.value = false
  }
})

async function submitAuthForm() {
  isLoading.value = true
  message.value = ''
  messageType.value = ''

  try {
    const response = await $fetch<{ user: SessionUser }>(mode.value === 'register' ? '/api/auth/register' : '/api/auth/login', {
      method: 'POST',
      body: {
        ...(mode.value === 'register' ? { name: name.value } : {}),
        email: email.value,
        password: password.value
      }
    })

    currentUser.value = response.user
    showStorefront.value = false
    showAuth.value = false
    name.value = ''
    email.value = ''
    password.value = ''
    message.value = ''
    messageType.value = ''
    authMessage.value = ''
  } catch (error: unknown) {
    message.value = getErrorMessage(
      error,
      mode.value === 'register'
        ? 'We couldn’t create your account. Check your details and try again.'
        : 'Email or password is incorrect. Please try again.'
    )
    messageType.value = 'error'
  } finally {
    isLoading.value = false
  }
}

async function signOut() {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    currentUser.value = null
    showAuth.value = false
    showStorefront.value = false
    authMessage.value = ''
  } catch (error: unknown) {
    authMessage.value = getErrorMessage(error, 'We could not sign you out. Please try again.')
  }
}

function switchMode(nextMode: 'login' | 'register') {
  mode.value = nextMode
  message.value = ''
  messageType.value = ''
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = error.data
    if (typeof data === 'object' && data !== null && 'statusMessage' in data && typeof data.statusMessage === 'string') {
      return data.statusMessage
    }
  }

  return fallback
}
</script>

<template>
  <div v-if="isCheckingSession" class="session-loading" role="status">Getting your good finds ready…</div>
  <AdminDashboard
    v-else-if="currentUser?.role === 'admin' && !showStorefront && !showAuth"
    @open-store="showStorefront = true"
    @sign-out="signOut"
  />
  <LandingPage
    v-else-if="!showAuth"
    :user="currentUser"
    @sign-in="showAuth = true"
    @sign-out="signOut"
    @admin-view="showStorefront = false"
  />
  <main v-else class="login-page">
    <p v-if="authMessage" class="session-error" role="alert">{{ authMessage }}</p>
    <section class="login-card" aria-label="Sign in to Polysoko">
      <aside class="welcome-panel">
        <a class="brand brand-light" href="/" aria-label="Polysoko home">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M5 10.5h22l-2 17H7l-2-17Z" fill="currentColor" />
              <path d="M11 12V8a5 5 0 0 1 10 0v4" stroke="#174E3B" stroke-width="2.4" stroke-linecap="round" />
              <path d="m12 19 2.7 2.7 5.6-5.8" stroke="#174E3B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
          <span>polysoko</span>
        </a>

        <div class="welcome-copy">
          <span class="eyebrow"><span class="eyebrow-dot" /> GOOD TO SEE YOU</span>
          <h1>Your next<br>great find<br>is waiting.</h1>
          <p>Sign in and pick up right where your good taste left off.</p>
        </div>

        <div class="showcase" aria-hidden="true">
          <div class="showcase-orbit orbit-one" />
          <div class="showcase-orbit orbit-two" />
          <div class="showcase-sun" />
          <div class="showcase-card card-back">
            <span class="product-tag">JUST LANDED</span>
            <div class="mini-bag">
              <div class="bag-handle" />
              <div class="bag-body"><span>p.</span></div>
            </div>
            <span class="product-caption">A little something<br>for your everyday.</span>
          </div>
          <div class="showcase-card card-front">
            <div class="product-photo">
              <div class="vase vase-tall" />
              <div class="vase vase-short" />
              <div class="product-leaf leaf-one" />
              <div class="product-leaf leaf-two" />
            </div>
            <div class="product-info">
              <span>THE LITTLE THINGS</span>
              <span class="product-price">from $12</span>
            </div>
          </div>
          <span class="floating-sparkle sparkle-one">✳</span>
          <span class="floating-sparkle sparkle-two">✳</span>
        </div>

        <div class="panel-footer">
          <span>Thoughtful finds. A happier everyday.</span>
          <span class="footer-line" />
        </div>
      </aside>

      <div class="form-panel">
        <a class="brand brand-mobile" href="/" aria-label="Polysoko home">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M5 10.5h22l-2 17H7l-2-17Z" fill="currentColor" />
              <path d="M11 12V8a5 5 0 0 1 10 0v4" stroke="#174E3B" stroke-width="2.4" stroke-linecap="round" />
              <path d="m12 19 2.7 2.7 5.6-5.8" stroke="#174E3B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
          <span>polysoko</span>
        </a>

        <div class="form-content">
          <div class="form-heading">
            <span class="form-kicker">YOUR ACCOUNT</span>
            <h2>{{ mode === 'login' ? 'Welcome back' : 'Find your happy' }}<span class="heading-period">.</span></h2>
            <p>{{ mode === 'login' ? 'Sign in to explore all the things you love.' : 'Create an account to get started.' }}</p>
          </div>

          <form class="login-form" @submit.prevent="submitAuthForm">
            <template v-if="mode === 'register'">
              <label class="field-label" for="name">Your name</label>
              <div class="input-wrap">
                <input
                  id="name"
                  v-model="name"
                  type="text"
                  name="name"
                  placeholder="What should we call you?"
                  autocomplete="name"
                  maxlength="100"
                  required
                >
              </div>
            </template>

            <label class="field-label" for="email">Email address</label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <rect x="2.5" y="4" width="15" height="12" rx="2.2" stroke="currentColor" stroke-width="1.5" />
                <path d="m3.5 5.5 6.5 5 6.5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <input
                id="email"
                v-model="email"
                type="email"
                name="email"
                placeholder="you@example.com"
                autocomplete="email"
                required
              >
            </div>

            <div class="password-label-row">
              <label class="field-label" for="password">Password</label>
              <span class="password-hint">At least 8 characters</span>
            </div>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <rect x="3.5" y="8.5" width="13" height="9" rx="2" stroke="currentColor" stroke-width="1.5" />
                <path d="M6.5 8.5V6a3.5 3.5 0 0 1 7 0v2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <circle cx="10" cy="13" r="1" fill="currentColor" />
              </svg>
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                name="password"
                placeholder="Enter your password"
                :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
                minlength="8"
                maxlength="128"
                required
              >
              <button
                class="password-toggle"
                type="button"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                @click="showPassword = !showPassword"
              >
                <svg v-if="showPassword" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M2.2 10s2.8-5 7.8-5 7.8 5 7.8 5-2.8 5-7.8 5-7.8-5-7.8-5Z" stroke="currentColor" stroke-width="1.5" />
                  <circle cx="10" cy="10" r="2.2" stroke="currentColor" stroke-width="1.5" />
                </svg>
                <svg v-else viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="m3 3 14 14M8.6 5.2A8 8 0 0 1 10 5c5 0 7.8 5 7.8 5a12 12 0 0 1-2.3 2.7M5.2 6.3C3.3 7.5 2.2 10 2.2 10s2.8 5 7.8 5c.9 0 1.7-.2 2.4-.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>

            <div class="form-options">
              <span class="secure-note">
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 1.8 13 4v3.4c0 3.2-2.1 5.4-5 6.8-2.9-1.4-5-3.6-5-6.8V4l5-2.2Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
                  <path d="m5.8 7.8 1.5 1.5 2.9-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                Secure sign in
              </span>
            </div>

            <p v-if="message" class="form-message" :class="`message-${messageType}`" role="status" aria-live="polite">
              {{ message }}
            </p>

            <button class="submit-button" type="submit" :disabled="isLoading">
              <span>{{ isLoading ? (mode === 'register' ? 'Creating account…' : 'Signing you in…') : (mode === 'register' ? 'Create account' : 'Sign in') }}</span>
              <svg v-if="!isLoading" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <span v-else class="loading-spinner" aria-hidden="true" />
            </button>
          </form>

          <div class="form-divider"><span>MADE FOR GOOD FINDS</span></div>
          <p class="signup-prompt">
            <span>{{ mode === 'login' ? 'New around here?' : 'Already have an account?' }}</span>
            <button type="button" class="mode-toggle" @click="switchMode(mode === 'login' ? 'register' : 'login')">
              {{ mode === 'login' ? 'Create an account' : 'Sign in' }}
            </button>
          </p>
        </div>

        <footer class="form-footer">
          <span>© 2026 Polysoko</span>
          <span class="footer-separator">·</span>
          <span>Shop happy. Live well.</span>
        </footer>
      </div>
    </section>
  </main>
</template>

<style>
:root {
  font-family: 'Segoe UI', sans-serif;
  color: #202a23;
  background: #f3f5ef;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-optical-sizing: auto;
  font-weight: 400;
}

* {
  box-sizing: border-box;
}

body {
  min-width: 320px;
  min-height: 100vh;
  margin: 0;
}

button,
input {
  font: inherit;
}

button,
a,
input {
  -webkit-tap-highlight-color: transparent;
}

.login-page {
  display: grid;
  min-height: 100vh;
  padding: 48px 28px;
  place-items: center;
  background:
    radial-gradient(ellipse at 12% 14%, rgba(216, 226, 203, .45), transparent 34%),
    radial-gradient(ellipse at 87% 90%, rgba(226, 232, 214, .42), transparent 28%),
    #f3f5ef;
}

.login-card {
  display: grid;
  width: min(100%, 1080px);
  min-height: 690px;
  overflow: hidden;
  grid-template-columns: 0.94fr 1.06fr;
  border: 1px solid rgba(38, 67, 45, .08);
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 28px 80px rgba(34, 54, 38, .11), 0 3px 12px rgba(34, 54, 38, .04);
}

.welcome-panel {
  position: relative;
  display: flex;
  min-height: 690px;
  overflow: hidden;
  flex-direction: column;
  padding: 42px 44px 30px;
  background: #174e3b;
  color: #fff;
}

.welcome-panel::before,
.welcome-panel::after {
  position: absolute;
  width: 310px;
  height: 310px;
  border: 1px solid rgba(217, 234, 195, .1);
  border-radius: 50%;
  content: '';
  pointer-events: none;
}

.welcome-panel::before {
  right: -210px;
  bottom: -132px;
}

.welcome-panel::after {
  right: -178px;
  bottom: -100px;
}

.brand {
  z-index: 1;
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 10px;
  color: inherit;
  font-family: 'Segoe UI', sans-serif;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -.8px;
  text-decoration: none;
}

.brand-mark {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 11px;
  background: #d3ebaa;
  color: #d3ebaa;
}

.brand-mark svg {
  width: 25px;
  height: 25px;
}

.welcome-copy {
  z-index: 1;
  margin-top: 58px;
}

.eyebrow,
.form-kicker {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #b8d29b;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.65px;
}

.eyebrow-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #d3ebaa;
  box-shadow: 0 0 0 4px rgba(211, 235, 170, .12);
}

.welcome-copy h1 {
  margin: 17px 0 13px;
  font-family: 'Segoe UI', sans-serif;
  font-size: clamp(38px, 4vw, 51px);
  font-weight: 600;
  letter-spacing: -2.2px;
  line-height: 1.11;
}

.welcome-copy p {
  max-width: 270px;
  margin: 0;
  color: rgba(255, 255, 255, .67);
  font-size: 13px;
  line-height: 1.75;
}

.showcase {
  position: relative;
  width: 100%;
  max-width: 350px;
  height: 260px;
  margin: auto auto 15px;
}

.showcase-orbit {
  position: absolute;
  left: 50%;
  top: 52%;
  width: 310px;
  height: 180px;
  border: 1px solid rgba(209, 227, 183, .17);
  border-radius: 50%;
  transform: translate(-50%, -50%) rotate(-24deg);
}

.orbit-two {
  width: 355px;
  height: 215px;
  transform: translate(-50%, -50%) rotate(28deg);
}

.showcase-sun {
  position: absolute;
  top: 4px;
  right: 32px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #d5e9b3;
  box-shadow: 0 0 0 12px rgba(213, 233, 179, .08), 0 0 42px rgba(213, 233, 179, .18);
}

.showcase-card {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, .65);
  border-radius: 10px;
  background: #f8f4e8;
  color: #234a35;
  box-shadow: 0 16px 30px rgba(5, 37, 25, .23);
}

.card-back {
  top: 29px;
  left: 39px;
  width: 145px;
  height: 189px;
  padding: 14px 12px;
  transform: rotate(-10deg);
}

.product-tag {
  color: #628057;
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 1.2px;
}

.mini-bag {
  position: relative;
  display: grid;
  height: 107px;
  place-items: center;
}

.bag-handle {
  position: absolute;
  top: 18px;
  width: 29px;
  height: 30px;
  border: 3px solid #d5a25e;
  border-bottom: 0;
  border-radius: 17px 17px 0 0;
}

.bag-body {
  display: grid;
  width: 59px;
  height: 55px;
  margin-top: 27px;
  place-items: center;
  border-radius: 4px 4px 8px 8px;
  background: #e6b778;
  color: #fff4d8;
  font-family: 'Segoe UI', sans-serif;
  font-size: 23px;
  font-weight: 800;
}

.product-caption {
  display: block;
  color: #6a735d;
  font-family: 'Segoe UI', sans-serif;
  font-size: 8px;
  line-height: 1.5;
}

.card-front {
  top: 56px;
  right: 34px;
  width: 174px;
  height: 184px;
  padding: 8px;
  transform: rotate(7deg);
}

.product-photo {
  position: relative;
  height: 128px;
  overflow: hidden;
  border-radius: 6px;
  background: #e5e9d4;
}

.product-photo::after {
  position: absolute;
  right: -8px;
  bottom: 4px;
  left: -8px;
  height: 36px;
  border-radius: 50% 50% 0 0;
  background: rgba(199, 205, 169, .6);
  content: '';
}

.vase {
  position: absolute;
  z-index: 1;
  bottom: 20px;
  left: 62px;
  width: 34px;
  height: 68px;
  border-radius: 11px 11px 13px 13px;
  background: linear-gradient(90deg, #c58654, #dfa674 48%, #bf7849);
}

.vase::before {
  position: absolute;
  top: -5px;
  left: 10px;
  width: 14px;
  height: 9px;
  border-radius: 3px 3px 0 0;
  background: #c58654;
  content: '';
}

.vase-short {
  bottom: 18px;
  left: 101px;
  width: 28px;
  height: 46px;
  border-radius: 10px 10px 9px 9px;
  background: linear-gradient(90deg, #8b9b70, #b2b98d 50%, #84966b);
}

.vase-short::before {
  top: -4px;
  left: 8px;
  width: 12px;
  height: 7px;
  background: #8b9b70;
}

.product-leaf {
  position: absolute;
  z-index: 1;
  bottom: 81px;
  left: 73px;
  width: 26px;
  height: 11px;
  border-radius: 100% 0 100% 0;
  background: #63835b;
  transform: rotate(-32deg);
  transform-origin: left center;
}

.leaf-two {
  bottom: 91px;
  left: 88px;
  transform: rotate(18deg) scale(.8);
}

.product-info {
  display: flex;
  height: 34px;
  align-items: end;
  justify-content: space-between;
  color: #66745b;
  font-size: 6px;
  font-weight: 700;
  letter-spacing: .75px;
}

.product-price {
  color: #355841;
  font-size: 7px;
  letter-spacing: 0;
}

.floating-sparkle {
  position: absolute;
  color: #d7e6bd;
  font-size: 20px;
}

.sparkle-one {
  top: 36px;
  left: 215px;
}

.sparkle-two {
  right: 18px;
  bottom: 39px;
  font-size: 13px;
}

.panel-footer {
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: rgba(255, 255, 255, .57);
  font-size: 10px;
}

.footer-line {
  width: 35px;
  height: 1px;
  background: rgba(255, 255, 255, .35);
}

.form-panel {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 48px 60px 27px;
  background: #fff;
}

.brand-mobile {
  display: none;
  color: #174e3b;
}

.form-content {
  width: 100%;
  max-width: 370px;
  margin: auto;
}

.form-kicker {
  color: #788b72;
  font-size: 9px;
  letter-spacing: 1.55px;
}

.form-heading h2 {
  margin: 12px 0 7px;
  color: #202a23;
  font-family: 'Segoe UI', sans-serif;
  font-size: 31px;
  font-weight: 700;
  letter-spacing: -1.35px;
}

.heading-period {
  color: #89a96e;
}

.form-heading p {
  margin: 0;
  color: #8a928b;
  font-size: 12px;
}

.login-form {
  display: flex;
  flex-direction: column;
  margin-top: 35px;
}

.field-label {
  margin-bottom: 9px;
  color: #354139;
  font-size: 11px;
  font-weight: 600;
}

.password-label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 21px;
}

.password-hint {
  color: #a4aaa4;
  font-size: 9px;
}

.input-wrap {
  display: flex;
  height: 47px;
  align-items: center;
  gap: 11px;
  padding: 0 13px;
  border: 1px solid #e6e9e3;
  border-radius: 8px;
  background: #fff;
  transition: border-color .2s, box-shadow .2s;
}

.input-wrap:focus-within {
  border-color: #719569;
  box-shadow: 0 0 0 3px rgba(113, 149, 105, .12);
}

.input-icon {
  width: 17px;
  height: 17px;
  flex: 0 0 auto;
  color: #a1aaa0;
}

.input-wrap input {
  width: 100%;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #26342a;
  font-size: 11px;
}

.input-wrap input::placeholder {
  color: #b7bdb7;
}

.password-toggle {
  display: grid;
  width: 30px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: #969f96;
  cursor: pointer;
}

.password-toggle:hover {
  background: #f4f6f1;
  color: #456b49;
}

.password-toggle svg {
  width: 17px;
  height: 17px;
}

.form-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 17px;
}

.secure-note {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #a1aaa0;
  font-size: 9px;
}

.secure-note svg {
  width: 15px;
  height: 15px;
  color: #89a681;
}

.form-message {
  margin: 16px 0 0;
  padding: 10px 12px;
  border-radius: 7px;
  font-size: 11px;
  line-height: 1.5;
}

.message-error {
  background: #fff1ef;
  color: #a33b2c;
}

.message-success {
  background: #eef6e9;
  color: #3b6d3e;
}

.submit-button {
  display: flex;
  height: 48px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 24px;
  border: 0;
  border-radius: 8px;
  background: #174e3b;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 5px 12px rgba(23, 78, 59, .13);
  transition: transform .18s, background .18s, box-shadow .18s;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #216346;
  box-shadow: 0 8px 16px rgba(23, 78, 59, .18);
}

.submit-button:focus-visible {
  outline: 3px solid rgba(113, 149, 105, .38);
  outline-offset: 3px;
}

.submit-button:disabled {
  cursor: wait;
  opacity: .8;
}

.submit-button svg {
  width: 17px;
  height: 17px;
}

.loading-spinner {
  width: 15px;
  height: 15px;
  border: 2px solid rgba(255, 255, 255, .35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.form-divider {
  display: flex;
  align-items: center;
  gap: 13px;
  margin: 30px 0 20px;
  color: #b2b8b0;
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 1.2px;
}

.form-divider::before,
.form-divider::after {
  height: 1px;
  flex: 1;
  background: #edf0ea;
  content: '';
}

.signup-prompt {
  margin: 0;
  color: #909890;
  font-size: 10px;
  text-align: center;
}

.mode-toggle {
  padding: 0;
  border: 0;
  background: transparent;
  color: #426c49;
  font-size: inherit;
  font-weight: 600;
  cursor: pointer;
}

.mode-toggle:hover {
  color: #174e3b;
  text-decoration: underline;
}

.mode-toggle:focus-visible {
  border-radius: 2px;
  outline: 2px solid rgba(113, 149, 105, .6);
  outline-offset: 3px;
}

.form-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #adb3ac;
  font-size: 9px;
}

.footer-separator {
  color: #c7ccc5;
}

@media (max-width: 850px) {
  .login-page {
    padding: 28px 20px;
  }

  .login-card {
    width: min(100%, 620px);
    min-height: 0;
    grid-template-columns: 1fr;
  }

  .welcome-panel {
    display: none;
  }

  .form-panel {
    min-height: 650px;
    padding: 30px 50px 24px;
  }

  .brand-mobile {
    display: inline-flex;
  }

  .form-content {
    margin: auto;
  }
}

@media (max-width: 480px) {
  .login-page {
    display: block;
    min-height: 100vh;
    padding: 0;
    background: #fff;
  }

  .login-card {
    width: 100%;
    min-height: 100vh;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .form-panel {
    min-height: 100vh;
    padding: 27px 25px 22px;
  }

  .form-content {
    margin: auto 0;
  }

  .form-heading h2 {
    font-size: 29px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}

.session-loading {
  display: grid;
  min-height: 100vh;
  place-items: center;
  background: #fbfaf6;
  color: #52714c;
  font-size: 13px;
}

.session-error {
  position: fixed;
  z-index: 10;
  top: 16px;
  right: 16px;
  max-width: min(420px, calc(100vw - 32px));
  margin: 0;
  padding: 11px 14px;
  border: 1px solid #efcbc5;
  border-radius: 6px;
  background: #fff1ef;
  color: #a33b2c;
  font-size: 12px;
}
</style>
