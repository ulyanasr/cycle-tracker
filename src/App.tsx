import { useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { DiarySheet } from './components/DiarySheet';
import { SideMenu } from './components/SideMenu';
import { Home } from './screens/Home';
import { Notes } from './screens/Notes';
import { SubScreen } from './screens/SubScreen';

type Screen = 'home' | 'notes' | 'history' | 'forecasts';

export function App() {
  const [screen, setScreen] = useState<Screen>('home');
  // Экран, с которого открыли меню: туда возвращает «назад» из подэкранов
  const [base, setBase] = useState<'home' | 'notes'>('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [diaryOpen, setDiaryOpen] = useState(false);

  const goBase = (s: 'home' | 'notes') => {
    setBase(s);
    setScreen(s);
  };
  const openFromMenu = (s: Screen) => {
    setMenuOpen(false);
    setScreen(s);
  };
  const openMenu = () => setMenuOpen(true);

  return (
    <>
      {screen === 'home' && <Home onMenu={openMenu} />}
      {screen === 'notes' && <Notes onMenu={openMenu} />}
      {screen === 'history' && (
        <SubScreen title="История циклов" onBack={() => setScreen(base)}>
          <p className="placeholder">Средние, разброс и список циклов появятся на этапе 8.</p>
        </SubScreen>
      )}
      {screen === 'forecasts' && (
        <SubScreen title="Как считаются прогнозы" onBack={() => setScreen(base)}>
          <p className="placeholder">Описание прогнозов появится на этапе 8.</p>
        </SubScreen>
      )}

      <BottomNav
        current={screen === 'home' || screen === 'notes' ? screen : null}
        onHome={() => goBase('home')}
        onAdd={() => setDiaryOpen(true)}
        onNotes={() => goBase('notes')}
      />

      <SideMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onHistory={() => openFromMenu('history')}
        onForecasts={() => openFromMenu('forecasts')}
      />
      <DiarySheet open={diaryOpen} onClose={() => setDiaryOpen(false)} />
    </>
  );
}
