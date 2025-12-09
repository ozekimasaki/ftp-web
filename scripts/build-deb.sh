#!/bin/bash
set -e

# プロジェクトルートに移動
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

# バージョン情報
VERSION="1.0.0"
PACKAGE_NAME="ftp-webui"
ARCH="arm64"

# ビルドディレクトリ
BUILD_DIR="$PROJECT_ROOT/release/deb-build"
DEB_ROOT="$BUILD_DIR/${PACKAGE_NAME}_${VERSION}_${ARCH}"
INSTALL_DIR="$DEB_ROOT/opt/ftp-webui"

echo "🧹 クリーンアップ..."
rm -rf "$BUILD_DIR"

echo "📁 ディレクトリ作成..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$DEB_ROOT/DEBIAN"
mkdir -p "$DEB_ROOT/usr/bin"
mkdir -p "$DEB_ROOT/usr/share/applications"
mkdir -p "$DEB_ROOT/usr/share/icons/hicolor/256x256/apps"

echo "📦 ファイルコピー..."

# Electronアプリ（linux-arm64-unpacked）をコピー
if [ -d "$PROJECT_ROOT/release/linux-arm64-unpacked" ]; then
    cp -r "$PROJECT_ROOT/release/linux-arm64-unpacked/"* "$INSTALL_DIR/"
else
    echo "❌ Electronビルドが見つかりません。まず 'npm run pack' を実行してください。"
    exit 1
fi

echo "📝 DEBIANコントロールファイル作成..."

# control ファイル
cat > "$DEB_ROOT/DEBIAN/control" << EOF
Package: ${PACKAGE_NAME}
Version: ${VERSION}
Section: net
Priority: optional
Architecture: ${ARCH}
Depends: libgtk-3-0, libnotify4, libnss3, libxss1, libxtst6, xdg-utils, libatspi2.0-0, libuuid1, libsecret-1-0
Maintainer: FTP WebUI
Description: FTP/FTPS/SFTP WebUI Desktop Application
 Linux ARM64 環境で動作する、WebベースのFTP/FTPS/SFTPクライアントです。
 マルチプロトコル対応（FTP、FTPS、SFTP）で、ファイルのアップロード、
 ダウンロード、削除、リネームなどの操作が可能です。
EOF

# postinst スクリプト
cat > "$DEB_ROOT/DEBIAN/postinst" << 'EOF'
#!/bin/bash
set -e

# デスクトップデータベース更新
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database /usr/share/applications || true
fi

# アイコンキャッシュ更新
if command -v gtk-update-icon-cache &> /dev/null; then
    gtk-update-icon-cache -f -t /usr/share/icons/hicolor || true
fi

exit 0
EOF
chmod 755 "$DEB_ROOT/DEBIAN/postinst"

# postrm スクリプト
cat > "$DEB_ROOT/DEBIAN/postrm" << 'EOF'
#!/bin/bash
set -e

# デスクトップデータベース更新
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database /usr/share/applications || true
fi

exit 0
EOF
chmod 755 "$DEB_ROOT/DEBIAN/postrm"

echo "🔗 シンボリックリンク作成..."
ln -sf /opt/ftp-webui/ftp-webui "$DEB_ROOT/usr/bin/ftp-webui"

echo "🖼️ デスクトップエントリ作成..."
cat > "$DEB_ROOT/usr/share/applications/ftp-webui.desktop" << EOF
[Desktop Entry]
Name=FTP WebUI
Comment=FTP/FTPS/SFTP Client
Exec=/opt/ftp-webui/ftp-webui
Icon=ftp-webui
Terminal=false
Type=Application
Categories=Network;FileTransfer;
StartupNotify=true
EOF

# アイコンコピー（デフォルトElectronアイコンを使用）
if [ -f "$PROJECT_ROOT/build/icon.png" ]; then
    cp "$PROJECT_ROOT/build/icon.png" "$DEB_ROOT/usr/share/icons/hicolor/256x256/apps/ftp-webui.png"
elif [ -f "$INSTALL_DIR/resources/app/build/icon.png" ]; then
    cp "$INSTALL_DIR/resources/app/build/icon.png" "$DEB_ROOT/usr/share/icons/hicolor/256x256/apps/ftp-webui.png"
fi

echo "📦 DEBパッケージ作成..."
# 適切な権限設定
find "$DEB_ROOT" -type d -exec chmod 755 {} \;
find "$DEB_ROOT" -type f -exec chmod 644 {} \;
chmod 755 "$DEB_ROOT/DEBIAN/postinst"
chmod 755 "$DEB_ROOT/DEBIAN/postrm"
chmod 755 "$INSTALL_DIR/ftp-webui"
chmod 755 "$INSTALL_DIR/chrome-sandbox"
chmod 4755 "$INSTALL_DIR/chrome-sandbox" 2>/dev/null || true

# DEBパッケージ生成
dpkg-deb --build --root-owner-group "$DEB_ROOT" "$PROJECT_ROOT/release/${PACKAGE_NAME}_${VERSION}_${ARCH}.deb"

echo "✅ 完了: release/${PACKAGE_NAME}_${VERSION}_${ARCH}.deb"
echo ""
echo "インストール方法:"
echo "  sudo dpkg -i release/${PACKAGE_NAME}_${VERSION}_${ARCH}.deb"
echo ""
echo "実行方法:"
echo "  ftp-webui"

