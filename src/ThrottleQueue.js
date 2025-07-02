import PQueue from 'p-queue';

export default class ThrottleQueue {

  /**
   * Creates an instance of ThrottleQueue.
   *
   * @param {number} [maxPerSecond=Infinity] The maximum number of tasks to process per second.
   * Optional, defaults to Infinity (no limit).
   */
  constructor(maxPerSecond = Infinity) {
    if (maxPerSecond === Infinity) {
      this.queue = new PQueue({ concurrency: Infinity });
    } else {
      const interval = Math.ceil(1000 / maxPerSecond);
      this.queue = new PQueue({ concurrency: 1, intervalCap: 1, interval });
    }
  }

  /**
   * Enqueue a task to be processed by the throttle queue.
   *
   * @param {Object} options The options for the task.
   * @param {Function} options.task The task to be enqueued.
   * @param {number} [options.ttl] The time-to-live for the task in seconds. Optional, if provided,
   * the task will only be processed if it is still valid when dequeued.
   * @param {number} [options.priority=0] The priority of the task. Optional, defaults to 0. Higher
   * priority tasks will be processed before lower priority ones. For example, the value 1 has a
   * higher priority than 0.
   * @returns {Promise<any>} A promise that resolves when the task is processed.
   */
  enqueue({ task, ttl, priority = 0 }) {
    const expireAt = ttl ? Date.now() + ttl * 1_000 : null;
    return this.queue.add(() => {
      if (expireAt && Date.now() > expireAt) {
        return null;
      }
      return task();
    }, { priority });
  }
}
