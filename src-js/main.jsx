const { invoke } = window.__TAURI__.tauri


function App() {

  const [state, setState] = React.useState({
    checkTime: 5 * 1000,
    autoPlayCheck: true,
    faceAreaRange: [10, 50],
    faceCoordinateOffset: 30,
    errorCountToask: 5
  });
  const updateState = React.useCallback((data) => {
    setState(data);
    console.log(data)
    invoke("set_config", { json: data });
  }, [])

  React.useEffect(() => {
    invoke("get_config").then(setState);
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
      localStorage.theme = 'dark'
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.theme = 'light'
    }
  }, [])

  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden">
      <div className="container mx-auto mt-10 rounded bg-gray-100 dark:bg-gray-700 w-11/12 xl:w-full">
        <div className="xl:w-full py-5 px-8 relative">
          <button type="button" className="absolute right-8" onClick={() => {
            if (!document.documentElement.classList.contains("dark")) {
              document.documentElement.classList.add('dark')
              localStorage.theme = 'dark'
            } else {
              document.documentElement.classList.remove('dark')
              localStorage.theme = 'light'
            }
          }}>
            <span className="dark:hidden "><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="w-6 h-6"><path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" className="fill-sky-400/20 stroke-sky-500"></path><path d="M12 4v1M17.66 6.344l-.828.828M20.005 12.004h-1M17.66 17.664l-.828-.828M12 20.01V19M6.34 17.664l.835-.836M3.995 12.004h1.01M6 6l.835.836" className="stroke-sky-500"></path></svg></span>
            <span className="hidden dark:inline"><svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><path fill-rule="evenodd" clip-rule="evenodd" d="M17.715 15.15A6.5 6.5 0 0 1 9 6.035C6.106 6.922 4 9.645 4 12.867c0 3.94 3.153 7.136 7.042 7.136 3.101 0 5.734-2.032 6.673-4.853Z" className="fill-sky-400/20"></path><path d="m17.715 15.15.95.316a1 1 0 0 0-1.445-1.185l.495.869ZM9 6.035l.846.534a1 1 0 0 0-1.14-1.49L9 6.035Zm8.221 8.246a5.47 5.47 0 0 1-2.72.718v2a7.47 7.47 0 0 0 3.71-.98l-.99-1.738Zm-2.72.718A5.5 5.5 0 0 1 9 9.5H7a7.5 7.5 0 0 0 7.5 7.5v-2ZM9 9.5c0-1.079.31-2.082.845-2.93L8.153 5.5A7.47 7.47 0 0 0 7 9.5h2Zm-4 3.368C5 10.089 6.815 7.75 9.292 6.99L8.706 5.08C5.397 6.094 3 9.201 3 12.867h2Zm6.042 6.136C7.718 19.003 5 16.268 5 12.867H3c0 4.48 3.588 8.136 8.042 8.136v-2Zm5.725-4.17c-.81 2.433-3.074 4.17-5.725 4.17v2c3.552 0 6.553-2.327 7.622-5.537l-1.897-.632Z" className="fill-sky-500"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M17 3a1 1 0 0 1 1 1 2 2 0 0 0 2 2 1 1 0 1 1 0 2 2 2 0 0 0-2 2 1 1 0 1 1-2 0 2 2 0 0 0-2-2 1 1 0 1 1 0-2 2 2 0 0 0 2-2 1 1 0 0 1 1-1Z" className="fill-sky-500"></path></svg></span>
          </button>
          <div className="flex items-center mx-auto">
            <div className="container mx-auto">
              <div className="mx-auto xl:w-full">
                <p className="text-lg text-gray-800 dark:text-gray-100 font-bold">系统设置</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 pt-1">通过人像识别及时提醒被识别人校准坐姿</p>
              </div>
            </div>
          </div>
        </div>
        <div className="container mx-auto pb-6">
          <div className="flex items-center pb-4 border-b border-gray-300 dark:border-gray-700 px-8 text-gray-800 dark:text-gray-100">
            <img className="dark:hidden" src="https://tuk-cdn.s3.amazonaws.com/can-uploader/simple_form-svg7.svg" alt="mail" />
            <img className="dark:block hidden" src="https://tuk-cdn.s3.amazonaws.com/can-uploader/simple_form-svg7dark.svg" alt="mail" />
            <p className="text-sm font-bold ml-2 text-gray-800 dark:text-gray-100">基础设置</p>
          </div>
          <div className="px-8">
            <div className="flex justify-between items-center mb-8 mt-4">
              <div className="w-9/12">
                <p className="text-sm text-gray-800 dark:text-gray-100 pb-1">检测间隔</p>
                <p id="cb1" className="text-sm text-gray-600 dark:text-gray-400">每5秒钟校准一次 5*1000 ms</p>
              </div>
              <div className="flex flex-col lg:py-0 py-4">
                <label className="lg:pt-4 text-gray-400 text-sm font-bold leading-tight tracking-normal mb-2"></label>
                <input className="text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-700 dark:focus:border-indigo-700 dark:border-gray-700 dark:bg-gray-800 bg-white font-normal w-64 h-10 flex items-center pl-3 text-sm border-gray-300 rounded border shadow" placeholder="1000"
                  value={state.checkTime}
                  onChange={(e) => {
                    state.checkTime = +e.target.value;
                    updateState({ ...state })
                  }}
                />
              </div>
            </div>
            <div className="flex justify-between items-center mb-8">
              <div className="w-9/12">
                <p className="text-sm text-gray-800 dark:text-gray-100 pb-1">启动自动监测</p>
                <p id="cb6" className="text-sm text-gray-600 dark:text-gray-400">启用应用时自动开始监测</p>
              </div>
              <div className="cursor-pointer rounded-full bg-gray-200 relative shadow-sm"
                onClick={() => {
                  state.autoPlayCheck = !state.autoPlayCheck;
                  updateState({ ...state })
                }}>
                <input aria-labelledby="cb6" type="checkbox" className="focus:outline-none checkbox w-6 h-6 rounded-full bg-white dark:bg-gray-400 absolute shadow-sm appearance-none cursor-pointer border border-transparent top-0 bottom-0 m-auto" checked={state.autoPlayCheck} />
                <label className="toggle-label block w-12 h-4 overflow-hidden rounded-full bg-gray-300 dark:bg-gray-800 cursor-pointer"></label>
              </div>
            </div>
            <div className="flex justify-between items-center mb-8">
              <div className="w-9/12">
                <p className="text-sm text-gray-800 dark:text-gray-100 pb-1">Debug</p>
                <p id="cb6" className="text-sm text-gray-600 dark:text-gray-400">启用人脸识别Debug窗口</p>
              </div>
              <div className="cursor-pointer rounded-full bg-gray-200 relative shadow-sm"
                onClick={() => {
                  state.debugWindow = !state.debugWindow;
                  updateState({ ...state })
                }}>
                <input aria-labelledby="cb6" type="checkbox" className="focus:outline-none checkbox w-6 h-6 rounded-full bg-white dark:bg-gray-400 absolute shadow-sm appearance-none cursor-pointer border border-transparent top-0 bottom-0 m-auto" checked={state.debugWindow} />
                <label className="toggle-label block w-12 h-4 overflow-hidden rounded-full bg-gray-300 dark:bg-gray-800 cursor-pointer"></label>
              </div>
            </div>

          </div>
          <div className="pb-4 border-b border-gray-300 dark:border-gray-700 px-8">
            <div className="flex items-center text-gray-800 dark:text-gray-100">
              <img className="dark:hidden" src="https://tuk-cdn.s3.amazonaws.com/can-uploader/simple_form-svg8.svg" alt="notification" />
              <img className="dark:hidden hidden" src="https://tuk-cdn.s3.amazonaws.com/can-uploader/simple_form-svg8dark.svg" alt="notification" />
              <p className="text-sm font-bold ml-2 text-gray-800 dark:text-gray-100">坐姿监测</p>
            </div>
          </div>
          <div className="px-8">
            <div className="flex justify-between items-center mb-8 mt-4">
              <div className="w-9/12">
                <p className="text-sm text-gray-800 dark:text-gray-100 pb-1">面部面积偏差</p>
                <p id="cb2" className="text-sm text-gray-600 dark:text-gray-400">通过识别出来的面部矩形面积大小确定距离屏幕的远近</p>
              </div>
              <div className="flex gap-3">
                <div className="flex flex-col lg:py-0 py-4">
                  <label className="lg:pt-4 text-gray-400 text-sm font-bold leading-tight tracking-normal mb-2"></label>
                  <input className="text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-700 dark:focus:border-indigo-700 dark:border-gray-700 dark:bg-gray-800 bg-white font-normal w-32 h-10 flex items-center pl-3 text-sm border-gray-300 rounded border shadow" placeholder="10"
                    value={state.faceAreaRange[0]}
                    onChange={(e) => {
                      state.faceAreaRange[0] = +e.target.value;
                      updateState({ ...state })
                    }}
                  />
                </div>
                <div className="flex flex-col lg:py-0 py-4">
                  <label className="lg:pt-4 text-gray-400 text-sm font-bold leading-tight tracking-normal mb-2"></label>
                  <input className="text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-700 dark:focus:border-indigo-700 dark:border-gray-700 dark:bg-gray-800 bg-white font-normal w-32 h-10 flex items-center pl-3 text-sm border-gray-300 rounded border shadow" placeholder="10"
                    value={state.faceAreaRange[1]}
                    onChange={(e) => {
                      state.faceAreaRange[1] = +e.target.value;
                      updateState({ ...state })
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center mb-8">
              <div className="w-9/12">
                <p className="text-sm text-gray-800 dark:text-gray-100 pb-1">面部定位偏差</p>
                <p id="cb3" className="text-sm text-gray-600 dark:text-gray-400">通过识别出来的面部矩形定位坐标来判断视线是否离开</p>
              </div>
              <div className="flex flex-col lg:py-0 py-4">
                <label className="lg:pt-4 text-gray-400 text-sm font-bold leading-tight tracking-normal mb-2"></label>
                <input className="text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-700 dark:focus:border-indigo-700 dark:border-gray-700 dark:bg-gray-800 bg-white font-normal w-64 h-10 flex items-center pl-3 text-sm border-gray-300 rounded border shadow" placeholder="30"
                  value={state.faceCoordinateOffset}
                  onChange={(e) => {
                    state.faceCoordinateOffset = +e.target.value;
                    updateState({ ...state })
                  }}
                />
              </div>
            </div>
            <div className="flex justify-between items-center mb-8">
              <div className="w-9/12">
                <p className="text-sm text-gray-800 dark:text-gray-100 pb-1">异常报警次数</p>
                <p id="cb5" className="text-sm text-gray-600 dark:text-gray-400">当异常次数超过设定次数时，推送提醒并显示正确的坐姿</p>
              </div>
              <div className="flex flex-col lg:py-0 py-4">
                <label className="lg:pt-4 text-gray-400 text-sm font-bold leading-tight tracking-normal mb-2"></label>
                <input className="text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-700 dark:focus:border-indigo-700 dark:border-gray-700 dark:bg-gray-800 bg-white font-normal w-64 h-10 flex items-center pl-3 text-sm border-gray-300 rounded border shadow" placeholder="30"
                  value={state.errorCountToask}
                  onChange={(e) => {
                    state.errorCountToask = +e.target.value;
                    updateState({ ...state })
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <App />
);