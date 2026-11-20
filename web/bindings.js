export const DEFAULT_BINDINGS = Object.freeze({ forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space', dash: 'ShiftLeft', interact: 'KeyE', pulse: 'KeyQ', pause: 'KeyP' });
export const BINDING_LABELS = { forward: 'Đi tới', back: 'Đi lùi', left: 'Sang trái', right: 'Sang phải', jump: 'Nhảy', dash: 'Lướt', interact: 'Nạp / châm dầu', pulse: 'Tỏa Sáng', pause: 'Tạm dừng' };
export function validateBindings(value) {
  const seen = new Set();
  for (const action of Object.keys(DEFAULT_BINDINGS)) {
    const code = value?.[action];
    if (typeof code !== 'string' || !/^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right)|Enter|Escape|Tab|Backspace|[A-Za-z]+)$/.test(code)) throw Error(`Phím không hợp lệ: ${BINDING_LABELS[action]}`);
    if (seen.has(code)) throw Error(`Trùng phím ${code}: mỗi hành động cần một phím riêng.`); seen.add(code);
  }
  return { ...value };
}
