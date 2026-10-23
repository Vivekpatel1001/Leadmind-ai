try:
    from langsmith import traceable
except Exception:
    def traceable(name: str = None, run_type: str = None, **kwargs):
        def decorator(func):
            return func
        return decorator
