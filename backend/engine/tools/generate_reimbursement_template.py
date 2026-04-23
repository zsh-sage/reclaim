from datetime import date
from pathlib import Path

from jinja2 import Template

_TEMPLATE_PATH = Path(__file__).parent.parent / "templates" / "reimbursement_template.html"


def generate_reimbursement_template(aggregated_results: dict) -> str:
    """
    Render a Business Travel Settlement HTML page from aggregated receipt results.

    aggregated_results: output of process_receipts()
    Returns the rendered HTML string.
    """
    html_src = _TEMPLATE_PATH.read_text(encoding="utf-8")
    template = Template(html_src)
    return template.render(
        **aggregated_results,
        generated_date=date.today().strftime("%Y-%m-%d"),
    )
