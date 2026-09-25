# Guía de despliegue de Diario Reflexivo en AWS

Este documento describe cómo desplegar la aplicación Diario Reflexivo en AWS usando S3 + CloudFront para el frontend y Lambda + API Gateway para el backend, con DynamoDB para persistencia.

## Arquitectura general

```
┌─────────────────────────────────────────┐
│         CloudFront (HTTPS)              │
│   (distribución con caché)              │
└──────────────────┬──────────────────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
   ┌───▼────────┐      ┌──────▼──────────┐
   │   S3       │      │   API Gateway   │
   │  (frontend)│      │  (Lambda proxy) │
   └────────────┘      └──────┬──────────┘
                               │
                       ┌───────▼────────┐
                       │  Lambda        │
                       │  (Flask app)   │
                       └───────┬────────┘
                               │
                       ┌───────▼────────┐
                       │   DynamoDB     │
                       │  (Entries,     │
                       │   Reflections) │
                       └────────────────┘
```

## Prerequisitos

- Cuenta de AWS con acceso a crear recursos (Lambda, DynamoDB, S3, CloudFront, Secrets Manager, IAM)
- AWS CLI configurado (`aws configure`)
- Node.js y npm instalados (para el frontend)
- Python 3.10+ instalado (para testear el backend localmente)
- Git para versionamiento

## Paso 1: Preparar las tablas DynamoDB

### Crear tabla de entradas

```bash
aws dynamodb create-table \
  --table-name DiaryEntries \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

Parámetros:
- `--table-name DiaryEntries`: nombre de la tabla (debe coincidir con `ENTRIES_TABLE` en Lambda)
- `AttributeType=S`: atributo string (UUID)
- `--billing-mode PAY_PER_REQUEST`: pago por solicitud (sin capacidad aprovisionada, ideal para apps pequeñas)
- `--region us-east-1`: cambia a tu región preferida

### Crear tabla de reflexiones

```bash
aws dynamodb create-table \
  --table-name Reflections \
  --attribute-definitions AttributeName=entry_id,AttributeType=S \
  --key-schema AttributeName=entry_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Verificar que las tablas están activas

```bash
aws dynamodb describe-table --table-name DiaryEntries --region us-east-1
```

Espera a que el estado sea `ACTIVE` (puede tomar 1-2 minutos).

## Paso 2: Guardar el secreto en AWS Secrets Manager

### Crear el secreto

```bash
aws secretsmanager create-secret \
  --name diario-reflexivo/anthropic-api-key \
  --secret-string sk-ant-... \
  --region us-east-1
```

Reemplaza `sk-ant-...` con tu clave real de la API de Anthropic.

Guarda el ARN del secreto (ej. `arn:aws:secretsmanager:us-east-1:123456789012:secret:diario-reflexivo/anthropic-api-key-xxxxx`), lo necesitarás después.

### Alternativa: usar variable de entorno directamente

Si prefieres no usar Secrets Manager (menos seguro pero más simple), puedes configurar la variable de entorno `ANTHROPIC_API_KEY` directamente en el handler Lambda en el paso 5.

## Paso 3: Crear el rol IAM para Lambda

### Crear la política de IAM

Crea un archivo `lambda-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Scan",
        "dynamodb:DeleteItem",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:123456789012:table/DiaryEntries",
        "arn:aws:dynamodb:us-east-1:123456789012:table/Reflections"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:diario-reflexivo/anthropic-api-key-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/*"
    }
  ]
}
```

Reemplaza `123456789012` con tu ID de cuenta de AWS (obtén con `aws sts get-caller-identity`).

### Crear el rol

```bash
# 1. Crear el rol
aws iam create-role \
  --role-name DiarioReflexivoLambdaRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "lambda.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }'

# 2. Asociar la política al rol
aws iam put-role-policy \
  --role-name DiarioReflexivoLambdaRole \
  --policy-name DiarioReflexivoLambdaPolicy \
  --policy-document file://lambda-policy.json
```

Guarda el ARN del rol (ej. `arn:aws:iam::123456789012:role/DiarioReflexivoLambdaRole`), lo necesitarás en el paso 5.

## Paso 4: Empaquetar el backend para Lambda

### Preparar el paquete

```bash
# 1. Crear un directorio de trabajo
mkdir -p /tmp/diario-lambda
cd /tmp/diario-lambda

# 2. Instalar las dependencias
pip install -r /ruta/a/proyecto/backend/requirements.txt -t .

# 3. Copiar el código de la app
cp /ruta/a/proyecto/backend/app.py .
cp /ruta/a/proyecto/backend/lambda_function.py .

# 4. Crear el archivo ZIP
zip -r ../diario-lambda.zip .

# 5. Verificar el contenido
unzip -l ../diario-lambda.zip | head -20
```

El archivo `diario-lambda.zip` contendrá todas las dependencias necesarias más tu código.

## Paso 5: Desplegar la función Lambda

### Crear la función

```bash
aws lambda create-function \
  --function-name diario-reflexivo-backend \
  --runtime python3.11 \
  --role arn:aws:iam::123456789012:role/DiarioReflexivoLambdaRole \
  --handler lambda_function.handler \
  --zip-file fileb:///tmp/diario-lambda.zip \
  --timeout 30 \
  --memory-size 256 \
  --region us-east-1
```

Parámetros:
- `--timeout 30`: tiempo máximo de ejecución (30 seg es suficiente para llamadas a Claude)
- `--memory-size 256`: memoria asignada (256 MB es el mínimo y suficiente)

### Configurar variables de entorno

```bash
aws lambda update-function-configuration \
  --function-name diario-reflexivo-backend \
  --environment Variables={
ENTRIES_TABLE=DiaryEntries,
REFLECTIONS_TABLE=Reflections,
ANTHROPIC_SECRET_NAME=diario-reflexivo/anthropic-api-key,
FRONTEND_ORIGIN=https://tu-dominio-cloudfront.cloudfront.net
} \
  --region us-east-1
```

Cambia `https://tu-dominio-cloudfront.cloudfront.net` a la URL real de tu CloudFront (la obtendrás en el paso 8).

Si no usas Secrets Manager, reemplaza `ANTHROPIC_SECRET_NAME` con:
```
ANTHROPIC_API_KEY=sk-ant-...
```

### Verificar el despliegue

```bash
aws lambda get-function --function-name diario-reflexivo-backend --region us-east-1
```

## Paso 6: Crear la API en API Gateway

### Crear la API HTTP

```bash
aws apigatewayv2 create-api \
  --name diario-reflexivo-api \
  --protocol-type HTTP \
  --target arn:aws:lambda:us-east-1:123456789012:function:diario-reflexivo-backend \
  --region us-east-1
```

Guarda el `ApiId` de la respuesta (ej. `abc123`).

### Crear integración Lambda

```bash
aws apigatewayv2 create-integration \
  --api-id abc123 \
  --integration-type AWS_PROXY \
  --integration-method POST \
  --payload-format-version 2.0 \
  --target-uri arn:aws:lambda:us-east-1:123456789012:function:diario-reflexivo-backend \
  --region us-east-1
```

Guarda el `IntegrationId` de la respuesta.

### Crear rutas

```bash
# Ruta catch-all para /api/*
aws apigatewayv2 create-route \
  --api-id abc123 \
  --route-key 'ANY /api/{proxy+}' \
  --target integrations/xxxxx \
  --region us-east-1

# Ruta de health check
aws apigatewayv2 create-route \
  --api-id abc123 \
  --route-key 'GET /health' \
  --target integrations/xxxxx \
  --region us-east-1
```

### Crear stage (entorno)

```bash
aws apigatewayv2 create-stage \
  --api-id abc123 \
  --stage-name prod \
  --auto-deploy \
  --region us-east-1
```

### Habilitar CORS

```bash
aws apigatewayv2 update-api \
  --api-id abc123 \
  --cors-configuration \
AllowOrigins=https://tu-dominio-cloudfront.cloudfront.net,
AllowMethods=GET,POST,DELETE,OPTIONS,PUT,
AllowHeaders=content-type,authorization,x-amz-date \
  --region us-east-1
```

### Obtener la URL de la API

```bash
aws apigatewayv2 get-api --api-id abc123 --query 'ApiEndpoint' --region us-east-1
```

La URL será algo como `https://abc123.execute-api.us-east-1.amazonaws.com`.

### Dar permisos a Lambda para ser invocada por API Gateway

```bash
aws lambda add-permission \
  --function-name diario-reflexivo-backend \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --statement-id ApiGatewayInvoke \
  --region us-east-1
```

## Paso 7: Crear el bucket S3 y distribución CloudFront

### Crear el bucket S3

```bash
BUCKET_NAME="diario-reflexivo-$(date +%s)"  # Nombre único

aws s3 mb s3://$BUCKET_NAME --region us-east-1

# Bloquear acceso público (CloudFront accederá vía OAC)
aws s3api put-public-access-block \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration \
"BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Versioning para trackear cambios
aws s3api put-bucket-versioning \
  --bucket $BUCKET_NAME \
  --versioning-configuration Status=Enabled
```

Guarda el nombre del bucket.

### Crear distribución CloudFront

Crea un archivo `cloudfront-config.json`:

```json
{
  "CallerReference": "diario-reflexivo-v1",
  "Comment": "CDN para Diario Reflexivo",
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3Origin",
        "DomainName": "BUCKET_NAME.s3.us-east-1.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        },
        "OriginAccessControlId": "OACID"
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3Origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "Compress": true
  },
  "Enabled": true
}
```

Reemplaza:
- `BUCKET_NAME` con el nombre de tu bucket
- `OACID` con el ID del Origin Access Control (crear uno si no existe)

Luego:

```bash
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json --region us-east-1
```

Alternativa simple (consola web):
1. Abre CloudFront en la consola de AWS
2. Crea una distribución
3. Origen: selecciona tu bucket S3
4. Crear OAC (Origin Access Control) automáticamente
5. Comportamiento por defecto: viewer protocol redirect to HTTPS
6. Crear

Guarda el **Domain Name** de CloudFront (ej. `d1234abcd.cloudfront.net`).

## Paso 8: Actualizar variables de entorno de Lambda con la URL real

Una vez que CloudFront esté desplegado, actualiza el `FRONTEND_ORIGIN` en Lambda:

```bash
aws lambda update-function-configuration \
  --function-name diario-reflexivo-backend \
  --environment Variables={
ENTRIES_TABLE=DiaryEntries,
REFLECTIONS_TABLE=Reflections,
ANTHROPIC_SECRET_NAME=diario-reflexivo/anthropic-api-key,
FRONTEND_ORIGIN=https://d1234abcd.cloudfront.net
} \
  --region us-east-1
```

## Paso 9: Build y despliegue del frontend

### Instalar dependencias

```bash
cd frontend
npm install
```

### Build con la URL de API Gateway

```bash
VITE_API_BASE=https://abc123.execute-api.us-east-1.amazonaws.com/api npm run build
```

Esto genera `frontend/dist/` con el build optimizado. La URL de API Gateway se inyecta en tiempo de compilación.

### Subir a S3

```bash
aws s3 sync frontend/dist/ s3://tu-bucket-name/ \
  --cache-control max-age=3600 \
  --delete \
  --region us-east-1
```

El flag `--cache-control` hace que el navegador cachee los assets 1 hora (evita que cambios se reflejen inmediatamente, pero reduce ancho de banda). Para desarrollo, usa `--cache-control max-age=0` para no cachear.

### Invalidar caché de CloudFront

```bash
DISTRIBUTION_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[0].Id" \
  --output text)

aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*" \
  --region us-east-1
```

## Paso 10: Testear la aplicación

1. Abre tu navegador y ve a `https://tu-dominio-cloudfront.cloudfront.net`
2. Crea una nueva entrada y verifica que se guarda
3. Genera una reflexión (esto llamará a la API de Claude)
4. Verifica que el listado muestra la entrada creada
5. Borra la entrada y confirma que desaparece

Si algo no funciona:
- Revisa los logs de CloudWatch: `aws logs tail /aws/lambda/diario-reflexivo-backend --follow`
- Verifica que DynamoDB tiene datos: `aws dynamodb scan --table-name DiaryEntries`
- Prueba el endpoint directamente: `curl https://abc123.execute-api.us-east-1.amazonaws.com/health`

## Costos aproximados (uso personal bajo)

- **DynamoDB**: $0 - $1.25/mes (pay-per-request, con límite de 25GB gratis/mes)
- **Lambda**: $0 - $0.20/mes (1M invocaciones gratis/mes, muy por debajo de uso personal)
- **CloudFront**: $0 - $0.50/mes (50GB gratis/mes de transferencia)
- **Secrets Manager**: $0.40/mes (por secreto)
- **S3**: $0.01/mes (primeros 10GB gratis para 12 meses)
- **API Gateway**: gratis para HTTP APIs (primeras 300M invocaciones/mes)

**Total**: ~$0.60/mes si estás en el free tier, ~$2/mes si no.

## Actualización de código

Para actualizar el código después del despliegue inicial:

### Backend
```bash
# 1. Preparar el nuevo ZIP
cd /tmp/diario-lambda
rm -rf *
pip install -r /ruta/a/proyecto/backend/requirements.txt -t .
cp /ruta/a/proyecto/backend/app.py .
cp /ruta/a/proyecto/backend/lambda_function.py .
zip -r ../diario-lambda.zip .

# 2. Actualizar la función Lambda
aws lambda update-function-code \
  --function-name diario-reflexivo-backend \
  --zip-file fileb:///tmp/diario-lambda.zip
```

### Frontend
```bash
# 1. Build
cd frontend
VITE_API_BASE=https://abc123.execute-api.us-east-1.amazonaws.com/api npm run build

# 2. Subir a S3
aws s3 sync frontend/dist/ s3://tu-bucket-name/ --delete

# 3. Invalidar CloudFront
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

## Troubleshooting

### "CORS error en el navegador"
- Verifica que `FRONTEND_ORIGIN` en Lambda coincide exactamente con la URL de CloudFront
- Verifica que API Gateway tiene CORS habilitado para ese origen
- Limpia el caché del navegador (Cmd+Shift+R o Ctrl+Shift+R)

### "DynamoDB request rate exceeded"
- Dinámica automáticamente sube la capacidad con `PAY_PER_REQUEST`, pero hay un límite de 40,000 WCU
- Para uso personal no debería ser un problema; si lo es, contacta a AWS

### "Lambda timeout"
- Aumenta el timeout de la función a 60s: `--timeout 60`
- Verifica que ANTHROPIC_API_KEY es válida (revisa los logs)

### "Frontend no actualiza después de cambios"
- Invalidar caché de CloudFront (paso 9, último comando)
- Limpiar caché del navegador

## Notas de seguridad

- **API_KEY de Anthropic**: siempre guardada en Secrets Manager o variables de entorno, nunca expuesta al frontend
- **S3 bucket**: completamente privado, acceso solo vía CloudFront + OAC
- **CORS**: restringido a tu dominio CloudFront, no `*` en producción
- **Lambda**: ejecuta con rol IAM mínimo (solo acceso a DynamoDB y Secrets Manager)

---

¿Preguntas o problemas? Revisa los logs de CloudWatch o abre un issue en el repositorio.
