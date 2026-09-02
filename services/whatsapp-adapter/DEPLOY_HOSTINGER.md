# Deploy no VPS da Hostinger

Passo a passo pra colocar o adaptador rodando 24/7 num VPS Ubuntu — sem
depender do plano pago de nenhum PaaS. Copie e cole os blocos, na ordem.

## 1. Qual plano contratar

Não precisa de nada grande: é um processo Node único, sem banco local (o
banco é o Supabase, remoto). O menor VPS KVM da Hostinger (1 vCPU, 4 GB RAM)
já sobra — o que importa mesmo é escolher a imagem **Ubuntu 24.04 LTS** na
hora de criar.

## 2. Primeiro acesso e usuário

```bash
ssh root@SEU_IP_AQUI

adduser haya
usermod -aG sudo haya
su - haya
```

A partir daqui, tudo roda como o usuário `haya`, não como root.

## 3. Node.js 22+

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git
node --version   # confirma 22.x ou mais
```

## 4. Clonar o repositório

```bash
git clone https://github.com/pietrofersan/hayatecnoogia.git
cd hayatecnoogia/services/whatsapp-adapter
git checkout claude/new-session-kgvti2   # ou a branch que estiver em produção
```

## 5. Instalar e buildar

```bash
npm install
npm run build
```

## 6. Variáveis de ambiente

```bash
cp .env.example .env
nano .env
```

Preencha:

```
SUPABASE_URL=https://ghkckfamnpivlwlcjoez.supabase.co
SUPABASE_SERVICE_ROLE_KEY=   # Supabase → Settings → API → service_role (secreta)
CRM_WORKSPACE_ID=00000000-0000-0000-0000-000000000001
CANAL_EXTERNAL_ID=principal
PORT=3000
```

O `.env` não vai pro Git (está no `.gitignore`) — fica só nesta máquina.

## 7. Systemd — fica no ar sozinho, sobrevive a reboot

```bash
sudo tee /etc/systemd/system/whatsapp-adapter.service > /dev/null <<'EOF'
[Unit]
Description=HAYA WhatsApp Adapter
After=network.target

[Service]
Type=simple
User=haya
WorkingDirectory=/home/haya/hayatecnoogia/services/whatsapp-adapter
EnvironmentFile=/home/haya/hayatecnoogia/services/whatsapp-adapter/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now whatsapp-adapter
```

## 8. Escanear o QR

O QR aparece direto no log — não precisa abrir porta nenhuma pra internet:

```bash
sudo journalctl -u whatsapp-adapter -f
```

Escaneie com **WhatsApp → Aparelhos conectados → Conectar um aparelho**. Depois
de conectar, o log mostra `WhatsApp conectado`.

## Manutenção

```bash
sudo systemctl status whatsapp-adapter     # está rodando?
sudo systemctl restart whatsapp-adapter    # reiniciar
sudo journalctl -u whatsapp-adapter -f     # acompanhar em tempo real
```

**Atualizar depois de um novo commit:**

```bash
cd ~/hayatecnoogia/services/whatsapp-adapter
git pull
npm install
npm run build
sudo systemctl restart whatsapp-adapter
```
