const PLAYER_NAME_KEY = 'skribbl_player_name';
const PLAYER_ID_KEY = 'skribbl_player_id';
const CURRENT_ROOM_KEY = 'skribbl_current_room';

export function getStoredPlayerName(): string {
  try {
    return sessionStorage.getItem(PLAYER_NAME_KEY) || localStorage.getItem(PLAYER_NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredPlayerName(name: string): void {
  try {
    sessionStorage.setItem(PLAYER_NAME_KEY, name);
    localStorage.setItem(PLAYER_NAME_KEY, name);
  } catch {
    // Ignore storage quota errors
  }
}

export function getStoredPlayerId(): string {
  try {
    let id = sessionStorage.getItem(PLAYER_ID_KEY);
    if (!id) {
      id = 'p_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      sessionStorage.setItem(PLAYER_ID_KEY, id);
    }
    return id;
  } catch {
    return 'p_' + Math.random().toString(36).substring(2, 11);
  }
}

export function getStoredRoomCode(): string {
  try {
    return sessionStorage.getItem(CURRENT_ROOM_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredRoomCode(code: string): void {
  try {
    if (code) {
      sessionStorage.setItem(CURRENT_ROOM_KEY, code);
    } else {
      sessionStorage.removeItem(CURRENT_ROOM_KEY);
    }
  } catch {
    // Ignore
  }
}
