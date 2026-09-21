#!/usr/bin/env bash

set -euo pipefail

ENV_FILE=".env.local"

pause() {
  printf "\nกด Enter เมื่อทำขั้นตอนนี้เสร็จแล้ว..."
  read -r
}

require_value() {
  local prompt="$1"
  local value=""

  while [[ -z "$value" ]]; do
    printf "%s: " "$prompt" >&2
    read -r value
  done

  printf "%s" "$value"
}

upsert_env() {
  local key="$1"
  local value="$2"
  local temp_file

  temp_file="$(mktemp)"

  if [[ -f "$ENV_FILE" ]] && grep -q "^${key}=" "$ENV_FILE"; then
    awk -v key="$key" -v value="$value" '
      index($0, key "=") == 1 { print key "=" value; next }
      { print }
    ' "$ENV_FILE" > "$temp_file"
  else
    if [[ -f "$ENV_FILE" ]]; then
      awk '{ print }' "$ENV_FILE" > "$temp_file"
    fi
    printf "%s=%s\n" "$key" "$value" >> "$temp_file"
  fi

  mv "$temp_file" "$ENV_FILE"
}

printf "Firebase Google Auth setup\n"
printf "สคริปต์นี้จะเก็บเฉพาะ Firebase Web SDK config ใน %s\n" "$ENV_FILE"
printf "และจะไม่แก้ FIREBASE_PRIVATE_KEY หรือ credential ฝั่ง server\n\n"

printf "ขั้นที่ 1/4: เปิด Google provider\n"
printf "1. เปิด Firebase Console > Authentication > Sign-in method\n"
printf "2. เปิดใช้งาน Google และเลือก support email\n"
pause

printf "\nขั้นที่ 2/4: คัดลอก Web SDK config\n"
printf "ไปที่ Project settings > General > Your apps > Web app > SDK setup and configuration\n"

api_key="$(require_value "apiKey")"
auth_domain="$(require_value "authDomain")"
project_id="$(require_value "projectId")"
storage_bucket="$(require_value "storageBucket")"
messaging_sender_id="$(require_value "messagingSenderId")"
app_id="$(require_value "appId")"
printf "measurementId (เว้นว่างได้): " >&2
read -r measurement_id
printf "โดเมนอีเมลที่อนุญาต [sennalabs.com]: " >&2
read -r allowed_domain
allowed_domain="${allowed_domain:-sennalabs.com}"

upsert_env "NEXT_FIREBASE_API_KEY" "$api_key"
upsert_env "NEXT_FIREBASE_AUTH_DOMAIN" "$auth_domain"
upsert_env "NEXT_FIREBASE_PROJECT_ID" "$project_id"
upsert_env "NEXT_FIREBASE_STORAGE_BUCKET" "$storage_bucket"
upsert_env "NEXT_FIREBASE_MESSAGING_SENDER_ID" "$messaging_sender_id"
upsert_env "NEXT_FIREBASE_APP_ID" "$app_id"
upsert_env "NEXT_FIREBASE_MEASUREMENT_ID" "$measurement_id"
upsert_env "NEXT_FIREBASE_ALLOWED_EMAIL_DOMAIN" "$allowed_domain"
chmod 600 "$ENV_FILE"

printf "บันทึก Web SDK config ลง %s แล้ว (ไม่ได้แสดงค่าออกหน้าจอ)\n" "$ENV_FILE"

printf "\nขั้นที่ 3/4: ตรวจ Authorized domains\n"
printf "ใน Firebase Console > Authentication > Settings > Authorized domains\n"
printf "ตรวจว่ามี localhost และ hostname ของ production ที่จะใช้งาน\n"
pause

printf "\nขั้นที่ 4/4: ทดสอบ\n"
printf "1. เริ่มระบบด้วย: yarn dev\n"
printf "2. เปิด http://localhost:3000\n"
printf "3. ทดสอบบัญชี @%s (ควรเข้าได้)\n" "$allowed_domain"
printf "4. ทดสอบบัญชีโดเมนอื่น (server ควรตอบ 403)\n"
printf "\nตั้งค่าเสร็จแล้ว\n"
