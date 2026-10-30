"""Add school class and study group.

Revision ID: b262e93ad070
Revises: d800b2b19fc1
"""

from alembic import op
import sqlalchemy as sa


revision = "b262e93ad070"
down_revision = "d800b2b19fc1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "student_profiles",
        sa.Column("school_class", sa.SmallInteger(), nullable=True),
    )
    op.add_column(
        "student_profiles",
        sa.Column("study_group", sa.String(length=20), nullable=True),
    )

    op.create_check_constraint(
        op.f("ck_student_profiles_school_class_valid"),
        "student_profiles",
        "school_class IS NULL OR school_class IN (9, 10)",
    )
    op.create_check_constraint(
        op.f("ck_student_profiles_study_group_valid"),
        "student_profiles",
        "study_group IS NULL OR study_group IN "
        "('science', 'business_studies', 'humanities')",
    )
    op.create_check_constraint(
        op.f("ck_student_profiles_school_details_consistent"),
        "student_profiles",
        "(school_class IS NULL AND study_group IS NULL) OR "
        "(school_class IS NOT NULL AND study_group IS NOT NULL "
        "AND education_stage = 'class_9_10')",
    )


def downgrade() -> None:
    op.drop_constraint(
        op.f("ck_student_profiles_school_details_consistent"),
        "student_profiles",
        type_="check",
    )
    op.drop_constraint(
        op.f("ck_student_profiles_study_group_valid"),
        "student_profiles",
        type_="check",
    )
    op.drop_constraint(
        op.f("ck_student_profiles_school_class_valid"),
        "student_profiles",
        type_="check",
    )
    op.drop_column("student_profiles", "study_group")
    op.drop_column("student_profiles", "school_class")
