#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::{
    ffi::c_void,
    fs,
    sync::{
        atomic::{AtomicI8, Ordering},
        Mutex,
    },
    thread, vec,
};

use lazy_static::lazy_static;
use opencv::{
    core::*,
    highgui::{imshow, wait_key},
    imgproc::{self, FONT_HERSHEY_COMPLEX, LINE_8},
    types::*,
    videoio::{VideoCapture, CAP_ANY},
};
use opencv::{highgui::destroy_window, prelude::*};

use notify_rust::Notification;
use serde::{Deserialize, Serialize};
use std::sync::atomic::AtomicBool;
use tauri::{CustomMenuItem, SystemTrayMenu, SystemTrayMenuItem};
use tauri::{SystemTray, SystemTrayEvent};

#[derive(Clone, Serialize, Deserialize)]
struct Config {
    checkTime: i32,
    autoPlayCheck: bool,
    faceAreaRange: Vec<f32>,
    faceCoordinateOffset: f32,
    errorCountToask: i32,
    debugWindow: bool,
    centerPoint: Option<(f32, f32)>,
}

impl Config {
    fn set(&mut self, o: &Config) {
        self.checkTime = o.checkTime;
        self.autoPlayCheck = o.autoPlayCheck;
        self.faceAreaRange = o.faceAreaRange.clone();
        self.faceCoordinateOffset = o.faceCoordinateOffset;
        self.errorCountToask = o.errorCountToask;
        self.debugWindow = o.debugWindow;
    }
}

lazy_static! {
    static ref CONFIG: Mutex<Config> = {
        let config_path = std::path::Path::new("config.json");
        if config_path.exists() {
            let json = std::fs::read_to_string("config.json").unwrap();
            Mutex::new(serde_json::from_str(json.as_str()).unwrap())
        } else {
            Mutex::new(Config {
                checkTime: 5 * 1000,
                autoPlayCheck: false,
                faceAreaRange: vec![10.0, 50.0],
                faceCoordinateOffset: 30.0,
                errorCountToask: 5,
                debugWindow: false,
                centerPoint: None,
            })
        }
    };
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn get_config() -> Result<Config, String> {
    // Ok(serde_json::to_string(&*CONFIG).map_err(|err| err.to_string())?)
    let mut y = CONFIG.lock().map_err(|err| err.to_string())?;
    Ok(y.clone())
}
#[tauri::command]
fn set_config(json: Config) -> Result<(), String> {
    let d = json.clone();
    CONFIG.lock().unwrap().set(&json);
    save_config();
    Ok(())
}
static PLAY_FLAG: AtomicBool = AtomicBool::new(false);
static ERROR_COUNT: AtomicI8 = AtomicI8::new(0);
static CURRENT_POINT: Mutex<(f32, f32)> = Mutex::new((0.0, 0.0));
static ERROR_TOASK_TIME: Mutex<u128> = Mutex::new(0);
fn save_config() {
    let config = CONFIG.lock().unwrap();
    fs::write(
        "config.json",
        serde_json::to_string(&config.clone()).unwrap(),
    )
    .unwrap();
}
fn main() {
    let tray_menu = SystemTrayMenu::new()
        .add_item(CustomMenuItem::new(
            "calibration".to_string(),
            ("Calibration"),
        ))
        .add_item(CustomMenuItem::new("play".to_string(), ("Play")))
        .add_item(CustomMenuItem::new("stop".to_string(), ("Stop")))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("setting".to_string(), ("Setting")))
        // .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("reload".to_string(), ("Reload")))
        .add_item(CustomMenuItem::new("quit".to_string(), ("Quit")));

    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "play" => {
                    if !PLAY_FLAG.load(Ordering::Relaxed) {
                        thread::spawn(|| run_video_calc());
                    }
                }
                "stop" => {
                    PLAY_FLAG.store(false, Ordering::Relaxed);
                }
                "reload" => app.restart(),
                "quit" => {
                    PLAY_FLAG.store(false, Ordering::Relaxed);
                    std::process::exit(0);
                }
                "setting" => {
                    tauri::WindowBuilder::new(
                        app,
                        "external", /* the unique window label */
                        tauri::WindowUrl::App("index.html".into()),
                    )
                    .title("Setting")
                    .inner_size(700., 600.)
                    .build()
                    .expect("failed to build window");
                }
                "calibration" => {
                    let current_point = CURRENT_POINT.lock().unwrap();
                    CONFIG.lock().unwrap().centerPoint = Some(current_point.clone());
                    save_config();
                }
                _ => {}
            },
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![get_config, set_config])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_app_handle, event| match event {
            tauri::RunEvent::ExitRequested { api, .. } => {
                api.prevent_exit();
            }
            tauri::RunEvent::Ready => {
                if CONFIG.lock().unwrap().autoPlayCheck {
                    thread::spawn(|| run_video_calc());
                }
            }
            _ => {}
        });
}

fn run_video_calc() {
    PLAY_FLAG.store(true, Ordering::Release);
    let m1 = std::path::Path::new("./modules/deploy.prototxt");
    if !m1.exists() {
        std::fs::create_dir_all("modules").unwrap();
        let res =  reqwest::blocking::get("https://ghproxy.com/https://raw.githubusercontent.com/opencv/opencv/master/samples/dnn/face_detector/deploy.prototxt").unwrap();
        std::fs::write(m1, res.text().unwrap()).unwrap();
    }
    let m2 = std::path::Path::new("./modules/res10_300x300_ssd_iter_140000_fp16.caffemodel");
    if !m2.exists() {
        let res =  reqwest::blocking::get("https://ghproxy.com/https://raw.githubusercontent.com/opencv/opencv_3rdparty/dnn_samples_face_detector_20180205_fp16/res10_300x300_ssd_iter_140000_fp16.caffemodel").unwrap();
        std::fs::write(m2, res.bytes().unwrap()).unwrap();
    }
    let mut module = opencv::dnn::read_net_from_caffe(
        "./modules/deploy.prototxt",
        "./modules/res10_300x300_ssd_iter_140000_fp16.caffemodel",
    )
    .unwrap();
    let mut cap = VideoCapture::new(0, CAP_ANY).unwrap();
    if !&cap.is_opened().unwrap() {
        panic!("Cannot open camera")
    }
    let mut frame = Mat::default();
    loop {
        let config = CONFIG.lock().unwrap();
        let ret = cap.read(&mut frame).unwrap();
        let mut tmpsrc = frame.clone();
        if !ret {
            println!("Can't receive frame (stream end?). Exiting ...\n");
            break;
        }
        if tmpsrc.channels() == 4 {
            let mut temp = Mat::default();
            imgproc::cvt_color(&mut tmpsrc, &mut temp, imgproc::COLOR_BGRA2BGR, 0).unwrap();
            tmpsrc = temp;
        }

        let mut blob = opencv::dnn::blob_from_image(
            &mut tmpsrc,
            1.0,
            Size::new(300, 300),
            Scalar::new(104.0, 177.0, 123.0, 1.0),
            false,
            false,
            CV_32F,
        )
        .unwrap();
        module
            .set_input(&mut blob, "data", 1.0, Scalar::default())
            .unwrap();
        let mut detection = module.forward_single("detection_out").unwrap();
        let detection_width = detection.mat_size()[2];
        let detection_height = detection.mat_size()[3];
        let detection_mat = unsafe {
            Mat::new_size_with_data(
                Size::new(detection_width, detection_height),
                CV_32F,
                detection.ptr_mut(0).unwrap() as *mut c_void,
                0,
            )
            .unwrap()
        };
        let rows = detection_mat.rows();
        let max21321321 = (0..rows)
            .map(|i| (i, detection_mat.at_2d::<f32>(i, 2).unwrap()))
            .reduce(|x, y| if x.1 > y.1 { x } else { y })
            .unwrap();

        let i = max21321321.0;
        // for i in 0..rows {
        let confidence = detection_mat.at_2d::<f32>(i, 2).unwrap();
        let confidence_threshold = 0.9;
        if *confidence > confidence_threshold {
            let x_left_bottom = detection_mat.at_2d::<f32>(i, 3).unwrap() * tmpsrc.cols() as f32;
            let y_left_bottom = detection_mat.at_2d::<f32>(i, 4).unwrap() * tmpsrc.rows() as f32;
            let x_right_top = detection_mat.at_2d::<f32>(i, 5).unwrap() * tmpsrc.cols() as f32;
            let y_right_top = detection_mat.at_2d::<f32>(i, 6).unwrap() * tmpsrc.rows() as f32;
            let rect = opencv::core::Rect {
                x: x_left_bottom as i32,
                y: y_left_bottom as i32,
                width: x_right_top as i32 - x_left_bottom as i32,
                height: y_right_top as i32 - y_left_bottom as i32,
            };
            let mut current_point = CURRENT_POINT.lock().unwrap();
            current_point.0 = x_left_bottom;
            current_point.1 = y_left_bottom;

            let face_area = rect.area() as f32;

            if face_area < config.faceAreaRange[0]
                || face_area > config.faceAreaRange[1]
                || (config.centerPoint.is_some()
                    && ((config.centerPoint.unwrap().0 - x_left_bottom).abs()
                        > config.faceCoordinateOffset
                        || (config.centerPoint.unwrap().1 - y_left_bottom).abs()
                            > config.faceCoordinateOffset))
            {
                let c = ERROR_COUNT.load(Ordering::Relaxed) as i32 + 1;
                let timestamp = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_millis();
                let mut error_totsk_time = ERROR_TOASK_TIME.lock().unwrap();
                if c > config.errorCountToask && timestamp - *error_totsk_time > 10 * 1000 {
                    Notification::new()
                        // .summary("Firefox News")
                        .body("您的姿态有问题 请调整一下。")
                        // .icon("firefox")
                        .show()
                        .unwrap();
                    *error_totsk_time = timestamp;
                    ERROR_COUNT.store(0, Ordering::Relaxed);
                } else {
                    ERROR_COUNT.store(c as i8, Ordering::Relaxed);
                }
            }
            // }
            if config.debugWindow {
                imgproc::put_text(
                    &mut frame,
                    &format!("xy: {} {}", x_left_bottom, y_left_bottom),
                    Point_ {
                        x: x_left_bottom as i32,
                        y: y_left_bottom as i32 + 10,
                    },
                    FONT_HERSHEY_COMPLEX,
                    0.5,
                    Scalar::new(0., 0., 255.0, 0.),
                    1,
                    LINE_8,
                    false,
                )
                .unwrap();
                imgproc::put_text(
                    &mut frame,
                    &format!("area: {}", rect.area()),
                    Point_ {
                        x: x_left_bottom as i32,
                        y: y_left_bottom as i32,
                    },
                    FONT_HERSHEY_COMPLEX,
                    0.5,
                    Scalar::new(0., 0., 255.0, 0.),
                    1,
                    LINE_8,
                    false,
                )
                .unwrap();
                imgproc::rectangle(
                    &mut frame,
                    rect,
                    Scalar::new(0., 0., 255.0, 0.),
                    1,
                    imgproc::LINE_8,
                    0,
                )
                .unwrap();
                imshow("live", &frame).unwrap();
            }
        }
        if !PLAY_FLAG.load(Ordering::Relaxed) {
            destroy_window("live").unwrap();
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(config.checkTime.try_into().unwrap()));
        if !PLAY_FLAG.load(Ordering::Relaxed) {
            destroy_window("live").unwrap();
            break;
        }
        wait_key(1).unwrap();
    }
}
