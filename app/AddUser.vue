<script setup lang="ts">
const emit = defineEmits<{
  created: []
  cancel: []
}>()

const isSaving = ref(false)
const errorMessage = ref('')
const form = reactive({ name: '', email: '', password: '', role: 'user' as 'user' | 'admin' })

async function submitUser() {
  isSaving.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/admin/users', { method: 'POST', body: { ...form } })
    emit('created')
  } catch (error: unknown) {
    errorMessage.value = getErrorMessage(error, 'Could not create the user account.')
  } finally {
    isSaving.value = false
  }
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
  <form class="admin-form" @submit.prevent="submitUser">
    <p v-if="errorMessage" class="user-form-error" role="alert">{{ errorMessage }}</p>
    <div class="admin-form-row">
      <label>Full name<input v-model="form.name" maxlength="100" required></label>
      <label>Email address<input v-model="form.email" type="email" maxlength="254" required></label>
    </div>
    <label>User role
      <select v-model="form.role" required>
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </select>
    </label>
    <label>Temporary password<input v-model="form.password" type="password" minlength="8" maxlength="128" required><span>Share this password securely; the user can sign in with it.</span></label>
    <div class="form-actions">
      <button type="button" class="secondary-action" :disabled="isSaving" @click="emit('cancel')">Cancel</button>
      <button type="submit" class="primary-action" :disabled="isSaving">{{ isSaving ? 'Creating…' : 'Create user' }}</button>
    </div>
  </form>
</template>

<style scoped>
.admin-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 18px;
  padding: 15px;
  border: 1px solid #e8ebe2;
  border-radius: 4px;
  background: #fafbf8;
}

.admin-form label {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
  color: #566450;
  font-size: 9px;
  font-weight: 600;
}

.admin-form label > span {
  color: #899184;
  font-size: 8px;
  font-weight: 400;
}

.admin-form input,
.admin-form select {
  width: 100%;
  min-height: 36px;
  padding: 8px 10px;
  border: 1px solid #e2e6dd;
  border-radius: 3px;
  background: #fff;
  color: #344539;
  font: inherit;
  font-size: 10px;
}

.admin-form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.primary-action,
.secondary-action {
  min-height: 36px;
  padding: 0 13px;
  border: 1px solid #dfe5da;
  border-radius: 4px;
  background: #fff;
  color: #42644c;
  font: inherit;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
}

.primary-action {
  border-color: #174e3b;
  background: #174e3b;
  color: #fff;
}

.primary-action:hover {
  background: #246548;
}

.primary-action:disabled,
.secondary-action:disabled {
  cursor: wait;
  opacity: .7;
}

.user-form-error {
  margin: 0;
  color: #a63d30;
  font-size: 10px;
}

button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid #779469;
  outline-offset: 2px;
}

@media (max-width: 620px) {
  .admin-form-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
</style>
