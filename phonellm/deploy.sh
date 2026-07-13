#!/usr/bin/env bash
set -euo pipefail

REGION="us-east-1"
REPOSITORY_NAME="fastapi-backend"
FUNCTION_NAME="fastapi-backend"
API_NAME="fastapi-backend-api"
LOCAL_IMAGE="${REPOSITORY_NAME}:latest"
CREDENTIALS_FILE="aws.script.keys"
ENV_FILE=".env"
DOCKERFILE_PATH="${DOCKERFILE_PATH:-Dockerfile.lambda}"
MEMORY_SIZE="2048"
TIMEOUT_SECONDS="30"
ARCHITECTURE="x86_64"

ROLE_NAME_DEFAULT="fastapi-backend-lambda-role"
ROLE_ARN="${LAMBDA_ROLE_ARN:-}"

log() { echo "[deploy] $*"; }
warn() { echo "[deploy][warn] $*" >&2; }
die() { echo "[deploy][error] $*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

require_cmd aws
require_cmd docker

[[ -f "$CREDENTIALS_FILE" ]] || die "Missing credentials file: $CREDENTIALS_FILE"

PYTHON_CMD=()

detect_python_runtime() {
  if command -v python3 >/dev/null 2>&1 && python3 -c "import sys" >/dev/null 2>&1; then
    PYTHON_CMD=(python3)
    return
  fi
  if command -v python >/dev/null 2>&1 && python -c "import sys" >/dev/null 2>&1; then
    PYTHON_CMD=(python)
    return
  fi
  if command -v py >/dev/null 2>&1 && py -3 -c "import sys" >/dev/null 2>&1; then
    PYTHON_CMD=(py -3)
    return
  fi
  die "No working Python runtime found (tried: python3, python, py -3)"
}

wait_for_lambda_update() {
  local max_attempts=60
  local sleep_seconds=5
  local attempt status reason

  for attempt in $(seq 1 "${max_attempts}"); do
    status="$(aws lambda get-function-configuration \
      --function-name "${FUNCTION_NAME}" \
      --region "${REGION}" \
      --query 'LastUpdateStatus' \
      --output text 2>/dev/null || true)"

    case "${status}" in
      Successful)
        return 0
        ;;
      Failed)
        reason="$(aws lambda get-function-configuration \
          --function-name "${FUNCTION_NAME}" \
          --region "${REGION}" \
          --query 'LastUpdateStatusReason' \
          --output text 2>/dev/null || true)"
        die "Lambda update failed: ${reason}"
        ;;
      InProgress|"")
        sleep "${sleep_seconds}"
        ;;
      *)
        # Defensive: unknown status, keep waiting.
        sleep "${sleep_seconds}"
        ;;
    esac
  done

  die "Timed out waiting for Lambda update to finish"
}

update_lambda_compute_config() {
  local with_arch="$1"
  local err_file attempt output
  err_file="$(mktemp)"

  for attempt in $(seq 1 20); do
    if [[ "${with_arch}" == "yes" ]]; then
      aws lambda update-function-configuration \
        --function-name "${FUNCTION_NAME}" \
        --memory-size "${MEMORY_SIZE}" \
        --timeout "${TIMEOUT_SECONDS}" \
        --architectures "${ARCHITECTURE}" \
        --region "${REGION}" >/dev/null 2>"${err_file}" && { rm -f "${err_file}"; wait_for_lambda_update; return 0; }
    else
      aws lambda update-function-configuration \
        --function-name "${FUNCTION_NAME}" \
        --memory-size "${MEMORY_SIZE}" \
        --timeout "${TIMEOUT_SECONDS}" \
        --region "${REGION}" >/dev/null 2>"${err_file}" && { rm -f "${err_file}"; wait_for_lambda_update; return 0; }
    fi

    output="$(<"${err_file}")"
    if [[ "${output}" == *"ResourceConflictException"* ]]; then
      log "Lambda update in progress; retrying configuration update (${attempt}/20)"
      sleep 5
      continue
    fi
    if [[ "${output}" == *"Unknown options: --architectures"* ]]; then
      rm -f "${err_file}"
      return 2
    fi

    cat "${err_file}" >&2
    rm -f "${err_file}"
    return 1
  done

  cat "${err_file}" >&2
  rm -f "${err_file}"
  return 1
}

update_lambda_env_config() {
  local env_payload="$1"
  local err_file attempt output
  err_file="$(mktemp)"

  for attempt in $(seq 1 20); do
    aws lambda update-function-configuration \
      --function-name "${FUNCTION_NAME}" \
      --environment "${env_payload}" \
      --region "${REGION}" >/dev/null 2>"${err_file}" && { rm -f "${err_file}"; wait_for_lambda_update; return 0; }

    output="$(<"${err_file}")"
    if [[ "${output}" == *"ResourceConflictException"* ]]; then
      log "Lambda update in progress; retrying env update (${attempt}/20)"
      sleep 5
      continue
    fi

    cat "${err_file}" >&2
    rm -f "${err_file}"
    return 1
  done

  cat "${err_file}" >&2
  rm -f "${err_file}"
  return 1
}

load_and_configure_aws_credentials() {
  # shellcheck disable=SC1090
  source "$CREDENTIALS_FILE"

  local access_key secret_key session_token
  access_key="${AWS_ACCESS_KEY_ID:-${aws_access_key_id:-}}"
  secret_key="${AWS_SECRET_ACCESS_KEY:-${aws_secret_access_key:-}}"
  session_token="${AWS_SESSION_TOKEN:-${aws_session_token:-}}"

  [[ -n "${access_key}" ]] || die "AWS access key not found in $CREDENTIALS_FILE"
  [[ -n "${secret_key}" ]] || die "AWS secret key not found in $CREDENTIALS_FILE"
  [[ -n "${session_token}" ]] || die "AWS session token not found in $CREDENTIALS_FILE"

  aws configure set aws_access_key_id "${access_key}"
  aws configure set aws_secret_access_key "${secret_key}"
  aws configure set aws_session_token "${session_token}"
  aws configure set region "${REGION}"
}

ensure_ecr_repo() {
  if ! aws ecr describe-repositories \
    --repository-names "${REPOSITORY_NAME}" \
    --region "${REGION}" >/dev/null 2>&1; then
    log "Creating ECR repository ${REPOSITORY_NAME}"
    aws ecr create-repository \
      --repository-name "${REPOSITORY_NAME}" \
      --region "${REGION}" >/dev/null
  else
    log "ECR repository exists: ${REPOSITORY_NAME}"
  fi
}

discover_or_create_role() {
  if [[ -n "${ROLE_ARN}" ]]; then
    log "Using role from LAMBDA_ROLE_ARN"
    return
  fi

  local existing
  existing="$(aws iam get-role --role-name "${ROLE_NAME_DEFAULT}" --query 'Role.Arn' --output text 2>/dev/null || true)"
  if [[ -n "${existing}" && "${existing}" != "None" ]]; then
    ROLE_ARN="${existing}"
    log "Using existing role: ${ROLE_NAME_DEFAULT}"
    return
  fi

  log "Attempting to create IAM role: ${ROLE_NAME_DEFAULT}"
  local trust_file
  trust_file="$(mktemp)"
  cat > "${trust_file}" <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
JSON

  if aws iam create-role \
    --role-name "${ROLE_NAME_DEFAULT}" \
    --assume-role-policy-document "file://${trust_file}" >/dev/null 2>&1; then
    aws iam attach-role-policy \
      --role-name "${ROLE_NAME_DEFAULT}" \
      --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole" >/dev/null
    ROLE_ARN="$(aws iam get-role --role-name "${ROLE_NAME_DEFAULT}" --query 'Role.Arn' --output text)"
    log "Created IAM role: ${ROLE_NAME_DEFAULT}"
    sleep 10
  else
    warn "Unable to create IAM role (common in AWS Academy restricted labs). Trying known lab roles."
    for candidate in "LabRole" "LearnerLabRole" "lambda-execution-role"; do
      existing="$(aws iam get-role --role-name "${candidate}" --query 'Role.Arn' --output text 2>/dev/null || true)"
      if [[ -n "${existing}" && "${existing}" != "None" ]]; then
        ROLE_ARN="${existing}"
        log "Using existing role: ${candidate}"
        break
      fi
    done
  fi

  rm -f "${trust_file}"
  [[ -n "${ROLE_ARN}" ]] || die "No Lambda role available. Set LAMBDA_ROLE_ARN and rerun."
}

create_or_update_lambda() {
  local err_file
  err_file="$(mktemp)"

  if aws lambda get-function --function-name "${FUNCTION_NAME}" --region "${REGION}" >/dev/null 2>&1; then
    log "Updating existing Lambda image"
    aws lambda update-function-code \
      --function-name "${FUNCTION_NAME}" \
      --image-uri "${IMAGE_URI}" \
      --region "${REGION}" >/dev/null
    wait_for_lambda_update
  else
    log "Creating Lambda function ${FUNCTION_NAME}"
    if ! aws lambda create-function \
      --function-name "${FUNCTION_NAME}" \
      --package-type Image \
      --code "ImageUri=${IMAGE_URI}" \
      --role "${ROLE_ARN}" \
      --memory-size "${MEMORY_SIZE}" \
      --timeout "${TIMEOUT_SECONDS}" \
      --architectures "${ARCHITECTURE}" \
      --region "${REGION}" >/dev/null 2>"${err_file}"; then
      if grep -qi "Unknown options: --architectures" "${err_file}"; then
        warn "AWS CLI does not support --architectures. Retrying Lambda create without it."
        aws lambda create-function \
          --function-name "${FUNCTION_NAME}" \
          --package-type Image \
          --code "ImageUri=${IMAGE_URI}" \
          --role "${ROLE_ARN}" \
          --memory-size "${MEMORY_SIZE}" \
          --timeout "${TIMEOUT_SECONDS}" \
          --region "${REGION}" >/dev/null
      else
        cat "${err_file}" >&2
        rm -f "${err_file}"
        die "Failed to create Lambda function"
      fi
    fi
    wait_for_lambda_update
  fi

  local update_rc=0
  update_lambda_compute_config "yes" || update_rc=$?
  if [[ ${update_rc} -ne 0 ]]; then
    if [[ ${update_rc} -eq 2 ]]; then
      warn "AWS CLI does not support --architectures for update-function-configuration. Retrying without it."
      update_lambda_compute_config "no" || die "Failed to update Lambda configuration"
    else
      die "Failed to update Lambda configuration"
    fi
  fi

  rm -f "${err_file}"
}

update_lambda_env_from_dotenv() {
  [[ -f "${ENV_FILE}" ]] || { warn "No ${ENV_FILE} found, skipping Lambda env injection"; return; }

  local env_payload

  env_payload="$("${PYTHON_CMD[@]}" - <<'PY' "${ENV_FILE}"
import json
import sys
from pathlib import Path

env_path = Path(sys.argv[1])

variables = {}
for line in env_path.read_text(encoding="utf-8").splitlines():
    stripped = line.strip()
    if not stripped or stripped.startswith("#") or "=" not in stripped:
        continue
    key, value = stripped.split("=", 1)
    key = key.strip()
    value = value.strip().strip("'").strip('"')
    if key:
        variables[key] = value

if "FFMPEG_PATH" not in variables:
    variables["FFMPEG_PATH"] = "/opt/bin/ffmpeg"

print(json.dumps({"Variables": variables}, separators=(",", ":")))
PY
)"

  log "Injecting environment variables from ${ENV_FILE} into Lambda"
  update_lambda_env_config "${env_payload}" || die "Failed to update Lambda environment variables"
}

create_or_update_http_api() {
  API_ID="$(aws apigatewayv2 get-apis \
    --region "${REGION}" \
    --query "Items[?Name=='${API_NAME}'].ApiId | [0]" \
    --output text)"

  if [[ -z "${API_ID}" || "${API_ID}" == "None" ]]; then
    log "Creating HTTP API ${API_NAME}"
    API_ID="$(aws apigatewayv2 create-api \
      --name "${API_NAME}" \
      --protocol-type HTTP \
      --cors-configuration AllowOrigins="*",AllowMethods="*",AllowHeaders="*" \
      --region "${REGION}" \
      --query 'ApiId' \
      --output text)"
  else
    log "Using existing HTTP API: ${API_ID}"
  fi

  local lambda_arn integration_id route_id
  lambda_arn="$(aws lambda get-function \
    --function-name "${FUNCTION_NAME}" \
    --region "${REGION}" \
    --query 'Configuration.FunctionArn' \
    --output text)"

  integration_id="$(aws apigatewayv2 get-integrations \
    --api-id "${API_ID}" \
    --region "${REGION}" \
    --query "Items[?IntegrationUri=='${lambda_arn}'].IntegrationId | [0]" \
    --output text)"

  if [[ -z "${integration_id}" || "${integration_id}" == "None" ]]; then
    integration_id="$(aws apigatewayv2 create-integration \
      --api-id "${API_ID}" \
      --integration-type AWS_PROXY \
      --integration-uri "${lambda_arn}" \
      --payload-format-version "2.0" \
      --region "${REGION}" \
      --query 'IntegrationId' \
      --output text)"
  fi

  for route_key in "ANY /" "ANY /{proxy+}"; do
    route_id="$(aws apigatewayv2 get-routes \
      --api-id "${API_ID}" \
      --region "${REGION}" \
      --query "Items[?RouteKey=='${route_key}'].RouteId | [0]" \
      --output text)"

    if [[ -z "${route_id}" || "${route_id}" == "None" ]]; then
      aws apigatewayv2 create-route \
        --api-id "${API_ID}" \
        --route-key "${route_key}" \
        --target "integrations/${integration_id}" \
        --region "${REGION}" >/dev/null
    else
      aws apigatewayv2 update-route \
        --api-id "${API_ID}" \
        --route-id "${route_id}" \
        --target "integrations/${integration_id}" \
        --region "${REGION}" >/dev/null
    fi
  done

  if aws apigatewayv2 get-stage \
    --api-id "${API_ID}" \
    --stage-name '$default' \
    --region "${REGION}" >/dev/null 2>&1; then
    aws apigatewayv2 update-stage \
      --api-id "${API_ID}" \
      --stage-name '$default' \
      --auto-deploy \
      --region "${REGION}" >/dev/null
  else
    aws apigatewayv2 create-stage \
      --api-id "${API_ID}" \
      --stage-name '$default' \
      --auto-deploy \
      --region "${REGION}" >/dev/null
  fi

  local source_arn statement_id
  source_arn="arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*/*"
  statement_id="apigw-${API_ID}"

  aws lambda add-permission \
    --function-name "${FUNCTION_NAME}" \
    --statement-id "${statement_id}" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "${source_arn}" \
    --region "${REGION}" >/dev/null 2>&1 || true

  API_URL="$(aws apigatewayv2 get-api \
    --api-id "${API_ID}" \
    --region "${REGION}" \
    --query 'ApiEndpoint' \
    --output text)"
}

log "Configuring AWS CLI credentials from ${CREDENTIALS_FILE}"
load_and_configure_aws_credentials
detect_python_runtime

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text --region "${REGION}")"
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
IMAGE_URI="${ECR_REGISTRY}/${REPOSITORY_NAME}:latest"

ensure_ecr_repo

log "Logging in to ECR ${ECR_REGISTRY}"
aws ecr get-login-password --region "${REGION}" | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

if [[ ! -f "${DOCKERFILE_PATH}" ]]; then
  warn "${DOCKERFILE_PATH} not found; falling back to Dockerfile"
  DOCKERFILE_PATH="Dockerfile"
fi

log "Building Docker image with ${DOCKERFILE_PATH} for linux/amd64 (Lambda compatible)"
# Use buildx with --load to produce a single local image (not manifest list/index).
# Disable provenance/sbom attestations to avoid unsupported media types in Lambda.
docker buildx build \
  --platform linux/amd64 \
  --provenance=false \
  --sbom=false \
  --load \
  -f "${DOCKERFILE_PATH}" \
  -t "${REPOSITORY_NAME}" \
  .

log "Tagging and pushing image to ECR"
docker tag "${LOCAL_IMAGE}" "${IMAGE_URI}"
docker push "${IMAGE_URI}"

discover_or_create_role
create_or_update_lambda
update_lambda_env_from_dotenv
create_or_update_http_api

echo
echo "✔ ECR repo: ${ECR_REGISTRY}/${REPOSITORY_NAME}"
echo "✔ Lambda name: ${FUNCTION_NAME}"
echo "✔ API Gateway URL: ${API_URL}"
echo "✔ region ${REGION}"
