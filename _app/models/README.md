# Models

Diretório para modelos ONNX usados pelos acceptance checks server-side.

Os arquivos `.onnx` ficam fora do git (ver `.gitignore`). Para popular o
diretório localmente:

```sh
pnpm models:download
```

O `pnpm build` chama esse script automaticamente antes do `next build`,
então deploys de produção já saem com os modelos no bundle.

## Modelos atuais

| Arquivo               | Usado por                          | Tamanho | Origem |
|-----------------------|------------------------------------|---------|--------|
| `yolov8n.onnx`        | `acceptance/subject-count.ts`      | ~12MB   | `huggingface.co/Xenova/yolov8n` |
| `yolov8n-pose.onnx`   | `acceptance/anatomy-sanity.ts`     | ~13MB   | `huggingface.co/Xenova/yolov8n-pose` |

## Overrides

- `MODELS_YOLOV8N_URL`        — URL alternativa para baixar yolov8n.onnx
- `MODELS_YOLOV8N_POSE_URL`   — URL alternativa para baixar yolov8n-pose.onnx
- `YOLOV8N_ONNX_PATH`         — caminho absoluto para o .onnx (bypass do diretório padrão)
- `YOLOV8N_POSE_ONNX_PATH`    — caminho absoluto para o yolov8n-pose.onnx

## Graceful degradation

Se um modelo está ausente em runtime, o acceptance check correspondente
retorna `checked: false` (não bloqueia a geração).
