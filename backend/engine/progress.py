import asyncio
import json
import logging
import time
from dataclasses import dataclass
from uuid import uuid4

logger = logging.getLogger(__name__)


@dataclass
class _TrackedTask:
    queue: asyncio.Queue
    loop: asyncio.AbstractEventLoop
    created_at: float  # time.time()


async def _put_sse(queue: asyncio.Queue, sse_event: str) -> None:
    await queue.put(sse_event)


class ProgressTracker:
    _queues: dict[str, _TrackedTask] = {}

    @classmethod
    def create_task(cls) -> str:
        task_id = uuid4().hex
        cls._queues[task_id] = _TrackedTask(
            queue=asyncio.Queue(),
            loop=asyncio.get_running_loop(),
            created_at=time.time(),
        )
        logger.info("Created task %s", task_id)
        return task_id

    @classmethod
    def publish(cls, task_id: str, event: str, data: dict) -> None:
        tracked = cls._queues.get(task_id)
        if tracked is None:
            logger.warning("Task %s not found, dropping event %s", task_id, event)
            return
        if event in ("complete", "error"):
            sse = f"event: {event}\ndata: {json.dumps(data)}\n\n"
        else:
            payload = {"stage": event, **data}
            sse = f"event: progress\ndata: {json.dumps(payload)}\n\n"
        asyncio.run_coroutine_threadsafe(
            _put_sse(tracked.queue, sse), tracked.loop
        )

    @classmethod
    async def subscribe(cls, task_id: str):
        tracked = cls._queues.get(task_id)
        if tracked is None:
            yield f"event: error\ndata: {json.dumps({'error': 'Task not found'})}\n\n"
            return
        try:
            while True:
                sse = await tracked.queue.get()
                yield sse
                if sse.startswith("event: complete\n") or sse.startswith("event: error\n"):
                    return
        except asyncio.CancelledError:
            logger.info("Client disconnected from task %s", task_id)

    @classmethod
    async def cleanup(cls, task_id: str) -> None:
        await asyncio.sleep(60)
        removed = cls._queues.pop(task_id, None)
        if removed:
            logger.info("Cleaned up task %s", task_id)
