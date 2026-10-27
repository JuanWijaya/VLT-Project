import React from 'react';
import { 
  BookOpen, 
  ArrowRight, 
  Layers
} from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import type { EnrichedCourse } from '../../lib/roadmap/types';

interface CourseCardProps {
  course: EnrichedCourse;
  onSelect: (course: EnrichedCourse) => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, onSelect }) => {
  const isCompleted = course.totalLessons > 0 && course.completedLessons === course.totalLessons;

  return (
    <Card hoverable style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-md)',
          background: isCompleted ? 'var(--accent-emerald-subtle)' : 'var(--primary-subtle)',
          color: isCompleted ? 'var(--accent-emerald)' : 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <BookOpen size={20} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Badge variant={isCompleted ? 'emerald' : 'primary'}>
            {course.progressPercentage}% Selesai
          </Badge>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            v{course.schemaVersion}
          </span>
        </div>
      </div>

      {/* Title & Description */}
      <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
        {course.title}
      </h3>
      <p style={{
        fontSize: '0.8125rem',
        color: 'var(--text-secondary)',
        lineHeight: 1.5,
        marginBottom: 16,
        flex: 1,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {course.description || 'Tidak ada deskripsi course.'}
      </p>

      {/* Progress Bar (FR-LEARN-06) */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 6 }}>
          <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Layers size={13} /> {course.completedLessons} dari {course.totalLessons} lesson selesai
          </span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {course.progressPercentage}%
          </span>
        </div>
        <div style={{
          height: 6,
          width: '100%',
          background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${course.progressPercentage}%`,
            background: isCompleted ? 'var(--accent-emerald)' : 'var(--primary)',
            transition: 'width var(--transition-normal)',
          }} />
        </div>
      </div>

      {/* Footer Info & Action */}
      <div style={{
        paddingTop: 14,
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 'auto',
      }}>
        <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          ID: {course.stableId}
        </span>

        <button
          onClick={() => onSelect(course)}
          className="vlt-btn vlt-btn-subtle vlt-btn-sm"
          style={{ gap: 6 }}
        >
          <span>Detail Roadmap</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </Card>
  );
};
