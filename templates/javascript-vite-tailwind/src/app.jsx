import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <header className="App-header">
        <p>Hello React!</p>
        <p>
          <button type="button" onClick={() => setCount((v) => v + 1)}>
            count is: {count}
          </button>
        </p>
        <p>
          Edit <code>App.jsx</code> and save to test HMR updates.
        </p>
      </header>
    </div>
  );
}

export default App;
