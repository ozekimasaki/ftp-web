/**
 * FileZilla XMLインポート機能
 */

import type { ProtocolType, SavedConnection } from '../types';

interface FileZillaServer {
  name: string;
  host: string;
  port: number;
  protocol: ProtocolType;
  username: string;
  password: string;
}

/**
 * FileZillaのプロトコル番号をProtocolTypeに変換
 */
function convertProtocol(protocolNum: string): ProtocolType {
  switch (protocolNum) {
    case '1': // SFTP
      return 'sftp';
    case '4': // FTPS explicit
    case '5': // FTPS implicit
      return 'ftps';
    case '0': // FTP
    default:
      return 'ftp';
  }
}

/**
 * Base64エンコードされたパスワードをデコード
 */
function decodePassword(pass: string, encoding?: string): string {
  if (encoding === 'base64') {
    try {
      return atob(pass);
    } catch {
      return pass;
    }
  }
  return pass;
}

/**
 * XMLからテキストコンテンツを取得
 */
function getTextContent(element: Element, tagName: string): string {
  const child = element.getElementsByTagName(tagName)[0];
  return child?.textContent || '';
}

/**
 * FileZillaのServer要素をパース
 */
function parseServer(serverElement: Element): FileZillaServer | null {
  const host = getTextContent(serverElement, 'Host');
  if (!host) return null;

  const portStr = getTextContent(serverElement, 'Port');
  const protocolStr = getTextContent(serverElement, 'Protocol');
  const protocol = convertProtocol(protocolStr);
  
  // デフォルトポート
  let port = parseInt(portStr) || (protocol === 'sftp' ? 22 : 21);

  const passElement = serverElement.getElementsByTagName('Pass')[0];
  const password = passElement 
    ? decodePassword(passElement.textContent || '', passElement.getAttribute('encoding') || '')
    : '';

  return {
    name: getTextContent(serverElement, 'Name') || host,
    host,
    port,
    protocol,
    username: getTextContent(serverElement, 'User') || '',
    password,
  };
}

/**
 * Folder要素を再帰的にパースしてサーバーを取得
 */
function parseFolderRecursive(folderElement: Element, prefix: string = ''): FileZillaServer[] {
  const servers: FileZillaServer[] = [];
  
  // フォルダ名を取得
  const folderName = folderElement.getAttribute('Name') || folderElement.getElementsByTagName('Name')[0]?.textContent || '';
  const newPrefix = prefix ? `${prefix}/${folderName}` : folderName;
  
  // 直下のServerをパース
  const childNodes = folderElement.childNodes;
  for (let i = 0; i < childNodes.length; i++) {
    const node = childNodes[i];
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      if (element.tagName === 'Server') {
        const server = parseServer(element);
        if (server) {
          // フォルダ名をプレフィックスとして追加
          if (newPrefix) {
            server.name = `${newPrefix}/${server.name}`;
          }
          servers.push(server);
        }
      } else if (element.tagName === 'Folder') {
        // サブフォルダを再帰的にパース
        servers.push(...parseFolderRecursive(element, newPrefix));
      }
    }
  }
  
  return servers;
}

/**
 * FileZilla XMLをパースしてSavedConnection[]に変換
 */
export function parseFileZillaXml(xmlContent: string): SavedConnection[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');
  
  // パースエラーチェック
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('XMLのパースに失敗しました');
  }
  
  const servers: FileZillaServer[] = [];
  
  // Serversセクションを探す
  const serversSection = doc.getElementsByTagName('Servers')[0];
  if (serversSection) {
    // 直下のServerとFolderをパース
    const childNodes = serversSection.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
      const node = childNodes[i];
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        if (element.tagName === 'Server') {
          const server = parseServer(element);
          if (server) {
            servers.push(server);
          }
        } else if (element.tagName === 'Folder') {
          servers.push(...parseFolderRecursive(element));
        }
      }
    }
  }
  
  // SavedConnection形式に変換
  return servers.map((server, index) => ({
    id: `filezilla-${Date.now()}-${index}`,
    name: server.name,
    config: {
      protocol: server.protocol,
      host: server.host,
      port: server.port,
      username: server.username,
      password: server.password,
    },
  }));
}

