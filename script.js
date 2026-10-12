import { firebaseConfig } from './firebase-config.js';

const lightbox = document.querySelector('.lightbox');
const lightboxImage = lightbox.querySelector('img');
const lightboxTitle = lightbox.querySelector('p');

for (const button of document.querySelectorAll('.photo-button')) {
  button.addEventListener('click', () => {
    lightboxImage.src = button.dataset.image;
    lightboxImage.alt = button.querySelector('img').alt;
    lightboxTitle.textContent = button.dataset.title;
    lightbox.showModal();
  });
}

lightbox.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', (event) => {
  if (event.target === lightbox) lightbox.close();
});

const commentsElement = document.querySelector('#comments');

function configured() {
  return firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.includes('REPLACE');
}

function avatarColor(nickname) {
  let value = 0;
  for (const character of nickname) value = (value * 31 + character.charCodeAt(0)) % 360;
  return `hsl(${value} 24% 42%)`;
}

function renderComment(data) {
  const article = document.createElement('article');
  article.className = 'comment';

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.style.background = avatarColor(data.nickname);
  avatar.textContent = data.nickname.trim().charAt(0).toUpperCase() || '?';

  const body = document.createElement('div');
  body.className = 'comment-body';
  const meta = document.createElement('div');
  meta.className = 'comment-meta';
  const name = document.createElement('strong');
  name.textContent = data.nickname;
  const time = document.createElement('time');
  const date = data.createdAt ? new Date(data.createdAt) : null;
  time.textContent = date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    : '방금 전';
  meta.append(name, time);

  const message = document.createElement('p');
  message.textContent = data.message;
  body.append(meta, message);

  article.append(avatar, body);
  return article;
}

async function startComments() {
  if (!configured()) {
    commentsElement.innerHTML = '<p class="comments-state">Firebase 설정 후 댓글이 표시됩니다.</p>';
    return;
  }

  const endpoint = new URL(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/comments`,
  );
  endpoint.searchParams.set('pageSize', '100');
  endpoint.searchParams.set('key', firebaseConfig.apiKey);

  try {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`Firestore request failed: ${response.status}`);
    const payload = await response.json();
    const comments = (payload.documents ?? []).map((document) => ({
      nickname: document.fields?.nickname?.stringValue ?? '',
      message: document.fields?.message?.stringValue ?? '',
      createdAt: document.fields?.createdAt?.timestampValue ?? '',
    })).filter((comment) => comment.nickname && comment.message)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

    commentsElement.replaceChildren();
    if (comments.length === 0) {
      commentsElement.innerHTML = '<p class="comments-state">아직 남겨진 기록이 없습니다.</p>';
      return;
    }
    for (const comment of comments) {
      commentsElement.append(renderComment(comment));
    }
  } catch (error) {
    console.error(error);
    commentsElement.innerHTML = '<p class="comments-state">댓글을 불러오지 못했습니다.</p>';
  }
}

startComments();
