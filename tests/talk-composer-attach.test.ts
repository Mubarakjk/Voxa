import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

describe('Talk composer attach vs tools wiring', () => {
  it('composer + opens attachment sheet, not Tools', () => {
    const composer = readFileSync('src/components/chat/chat-input-bar.tsx', 'utf8');
    assert.match(composer, /openAttachmentSheet/);
    assert.match(composer, /ActionSheetIOS\.showActionSheetWithOptions/);
    assert.match(composer, /pickFromGallery/);
    assert.match(composer, /launchImageLibraryAsync/);
    assert.match(composer, /launchCameraAsync/);
    assert.ok(!composer.includes('onOpenTools'));
    assert.ok(!composer.includes('Open chat tools'));
    assert.match(composer, /accessibilityLabel="Attach a photo"/);
    assert.match(composer, /accessibilityLabel="Take a photo"/);
  });

  it('Tools sheet remains reachable from Talk header menu', () => {
    const chat = readFileSync('src/screens/chat-screen.tsx', 'utf8');
    assert.match(chat, /ChatToolsSheet/);
    assert.match(chat, /setToolsSheetOpen\(true\)/);
    assert.match(chat, />Tools</);
    assert.ok(!chat.includes('onOpenTools='));
    // Header ellipsis still opens the more menu that contains Tools
    assert.match(chat, /setHeaderMenuOpen\(true\)/);
    assert.match(chat, /ellipsis-horizontal/);
  });
});
