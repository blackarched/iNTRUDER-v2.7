import cv2
import numpy as np
import redis
import time
import os
import json

class MotionDetector:
    def __init__(self):
        self.redis_client = redis.Redis(host=os.environ.get('REDIS_HOST', 'localhost'), port=6379, db=0)
        self.background_subtractor = cv2.createBackgroundSubtractorMOG2(history=500, varThreshold=50, detectShadows=True)
        self.motion_threshold = 1000  # Threshold for the number of white pixels to trigger a motion event

    def start(self):
        print("Motion detection microservice started.")
        # This is a placeholder for where the service would subscribe to a command channel
        # to be told which streams to monitor. For now, we'll simulate a single stream.
        self.process_stream('rtsp://dummy-stream-url/video')

    def process_stream(self, stream_url):
        cap = cv2.VideoCapture(stream_url)
        if not cap.isOpened():
            print(f"Error: Could not open video stream at {stream_url}")
            return

        while True:
            ret, frame = cap.read()
            if not ret:
                print("Stream ended. Reconnecting...")
                time.sleep(5)
                cap.release()
                cap = cv2.VideoCapture(stream_url)
                continue

            fg_mask = self.background_subtractor.apply(frame)
            # Apply some morphological operations to reduce noise
            fg_mask = cv2.erode(fg_mask, None, iterations=2)
            fg_mask = cv2.dilate(fg_mask, None, iterations=2)

            motion_pixels = cv2.countNonZero(fg_mask)

            if motion_pixels > self.motion_threshold:
                self.trigger_motion_event(stream_url, motion_pixels)

            # A short delay to prevent overwhelming the CPU
            time.sleep(0.1)

    def trigger_motion_event(self, stream_url, intensity):
        event_data = {
            'type': 'motion_detected',
            'stream_url': stream_url,
            'intensity': intensity,
            'timestamp': time.time(),
        }
        self.redis_client.publish('motion_events', json.dumps(event_data))
        print(f"Motion detected on {stream_url} with intensity {intensity}")

if __name__ == '__main__':
    detector = MotionDetector()
    detector.start()
