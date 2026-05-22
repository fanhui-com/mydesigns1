let currentKeyword = '';

function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function loadDesigns(keyword = '') {
  try {
    const u = keyword ? `/api/designs?keyword=${encodeURIComponent(keyword)}` : '/api/designs';
    const r = await fetch(u);
    const list = await r.json();
    const b = document.getElementById('tableBody');
    b.innerHTML = '';
    list.forEach(d => {
      const tr = document.createElement('tr');
      tr.dataset.id = d.id;
      tr.innerHTML = `
        <td>${escapeHtml(d.name)}</td>
        <td>${escapeHtml(d.version)}</td>
        <td>${escapeHtml(d.type)}</td>
        <td><a href="${escapeHtml(d.url)}" target="_blank" class="link-btn">打开</a></td>
        <td>${escapeHtml(d.remark)}</td>
        <td><button class="btn btn-del" onclick="delRow(this)">删除</button></td>
      `;
      b.appendChild(tr);
    });
  } catch (e) { alert('加载失败'); }
}

function refresh() { loadDesigns(currentKeyword); }

function addOneRow() {
  const b = document.getElementById('tableBody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input placeholder="名称"></td>
    <td><input value="V1.0"></td>
    <td><select><option>PC</option><option>PDA</option></select></td>
    <td><input placeholder="https://"></td>
    <td><input placeholder="备注"></td>
    <td>
      <button class="btn btn-save" onclick="save(this)">保存</button>
      <button class="btn btn-cancel" onclick="this.parentElement.parentElement.remove()">取消</button>
    </td>
  `;
  b.appendChild(tr);
}

async function save(btn) {
  const tr = btn.parentElement.parentElement;
  const [n, v, t, u, r] = tr.querySelectorAll('input, select');
  const name = n.value.trim(), version = v.value.trim(), type = t.value, url = u.value.trim(), remark = r.value.trim();
  if (!name || !version || !url) return alert('名称、版本、链接必填');
  
  const res = await fetch('/api/designs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, version, type, url, remark })
  });
  if (res.ok) refresh();
  else alert('保存失败');
}

async function delRow(btn) {
  if (!confirm('确定删除？')) return;
  const id = btn.parentElement.parentElement.dataset.id;
  const res = await fetch(`/api/designs/${id}`, { method: 'DELETE' });
  if (res.ok) refresh();
  else alert('删除失败');
}

document.addEventListener('DOMContentLoaded', () => {
  const s = document.getElementById('searchBtn');
  const k = document.getElementById('searchKeyword');
  s.onclick = () => { currentKeyword = k.value; refresh(); };
  k.onkeypress = e => e.key === 'Enter' && s.click();
  refresh();
});
