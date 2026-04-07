# ScreenCast — Installation

## Prérequis
- Node.js 18+
- npm

## Installation

```bash
# 1. Installe les dépendances
npm install

# 2. Rebuild robotjs pour Electron (OBLIGATOIRE pour le contrôle OS)
npm run install-robot

# 3. Lance l'app
npm start
```

## Utilisation

**Projecteur (PC qui partage) :**
1. Lance l'app → bouton **ROUGE** → sélectionne ton écran
2. Partage le code affiché au viewer

**Viewer (PC qui reçoit et contrôle) :**
1. Lance l'app → entre le code → bouton **BLEU**
2. L'écran du projecteur s'affiche en plein écran
3. La souris et le clavier contrôlent l'OS réel via robotjs

## Architecture
- Signalement : serveur PeerJS local (port 9000) ou 0.peerjs.com en fallback
- Transport : WebRTC P2P (PeerJS)
- Contrôle OS : robotjs via IPC Electron
- Chat : DataChannel WebRTC
- Caméra : getUserMedia overlay draggable

## Problèmes fréquents

**"robotjs non disponible"** → Lance `npm run install-robot`

**"Projecteur introuvable"** → Vérifie que les deux machines sont sur le même réseau
ou utilise un serveur de signalement public (modifie `localServer: false` dans main.js)

**Écran noir** → Vérifie les permissions de capture d'écran dans Préférences Système → Confidentialité → Enregistrement d'écran
