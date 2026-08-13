import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildEnginePhotoFilename, photoExtension } from './engine-photo-name';

describe('photoExtension', () => {
  it('reads the extension off a plain URL', () => {
    assert.equal(photoExtension('https://cdn.example.com/engines/a.png'), 'png');
    assert.equal(photoExtension('https://cdn.example.com/engines/a.JPEG'), 'jpeg');
  });

  it('decodes the Firebase Storage object path before looking for it', () => {
    const url =
      'https://firebasestorage.googleapis.com/v0/b/bucket.appspot.com/o/' +
      'companies%2Fc1%2Fmotors%2FEJ257%2Ffront.heic?alt=media&token=abc-123';
    assert.equal(photoExtension(url), 'heic');
  });

  it('ignores the query string, which is where the token lives', () => {
    const url = 'https://cdn.example.com/a.webp?alt=media&token=x.png';
    assert.equal(photoExtension(url), 'webp');
  });

  it('defaults to jpg for unknown or missing extensions', () => {
    assert.equal(photoExtension('https://cdn.example.com/engines/a'), 'jpg');
    assert.equal(photoExtension('https://cdn.example.com/engines/a.tiff'), 'jpg');
    assert.equal(photoExtension('not a url at all'), 'jpg');
  });
});

describe('buildEnginePhotoFilename', () => {
  it('names the file after the serial and a 1-based position', () => {
    assert.equal(
      buildEnginePhotoFilename('EJ257-12345', 1, 'https://cdn.example.com/a.jpg'),
      'EJ257-12345-2.jpg',
    );
  });

  it('strips characters that are illegal in a filename', () => {
    assert.equal(
      buildEnginePhotoFilename('EJ257/12345 #2', 0, 'https://cdn.example.com/a.png'),
      'EJ257-12345-2-1.png',
    );
  });

  it('falls back to a generic name when the serial is unusable', () => {
    assert.equal(buildEnginePhotoFilename('///', 0, 'https://cdn.example.com/a.jpg'), 'engine-1.jpg');
    assert.equal(buildEnginePhotoFilename('', 0, 'https://cdn.example.com/a.jpg'), 'engine-1.jpg');
  });
});
