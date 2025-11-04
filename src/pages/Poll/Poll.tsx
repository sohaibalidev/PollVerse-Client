import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '@/context/SocketContext';
import {
  Clock,
  Users,
  Check,
  Vote,
  ArrowLeft,
  BarChart3,
  Crown,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { BASE_URL } from '@/config';
import styles from './Poll.module.css';

interface Poll {
  id: string;
  code: string;
  name: string;
  question: string;
  answers: string[];
  multipleChoices: boolean;
  validTill: string;
  isActive: boolean;
  voteCounts: number[];
  totalVotes: number;
  userVote: number[] | null;
}

const Poll: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { socket, joinPoll, leavePoll } = useSocket();

  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (code) {
      fetchPoll();
      joinPoll(code);
    }

    return () => {
      if (code) {
        leavePoll(code);
      }
    };
  }, [code]);

  useEffect(() => {
    if (!socket) return;

    const handleVoteUpdate = (data: any) => {
      setPoll((prev) =>
        prev
          ? {
              ...prev,
              voteCounts: data.voteCounts,
              totalVotes: data.totalVotes,
            }
          : null
      );
    };

    socket.on('voteUpdate', handleVoteUpdate);

    return () => {
      socket.off('voteUpdate', handleVoteUpdate);
    };
  }, [socket]);

  const fetchPoll = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/polls/${code}`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setPoll(data.data);
        if (data.data.userVote) {
          setSelectedOptions(data.data.userVote);
        }
      } else {
        setError(data.message || 'Failed to fetch poll');
      }
    } catch (error) {
      console.error('Error fetching poll:', error);
      setError('Failed to fetch poll');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (index: number) => {
    if (!poll || poll.userVote || !poll.isActive) return;

    if (poll.multipleChoices) {
      setSelectedOptions((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
      );
    } else {
      setSelectedOptions([index]);
    }
  };

  const submitVote = async () => {
    if (!poll || selectedOptions.length === 0 || !poll.isActive) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`${BASE_URL}/polls/${code}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          selected: selectedOptions,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPoll((prev) =>
          prev
            ? {
                ...prev,
                voteCounts: data.data.voteCounts,
                totalVotes: data.data.totalVotes,
                userVote: selectedOptions,
              }
            : null
        );
      } else {
        alert(data.message || 'Failed to submit vote');
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
      alert('Failed to submit vote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatePercentage = (votes: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((votes / total) * 100);
  };

  const getTimeRemaining = (validTill: string): string => {
    const now = new Date().getTime();
    const end = new Date(validTill).getTime();
    const diff = end - now;

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getWinningOption = () => {
    if (!poll || poll.totalVotes === 0) return -1;

    const maxVotes = Math.max(...poll.voteCounts);
    const winningIndex = poll.voteCounts.findIndex((votes) => votes === maxVotes);

    const isTie = poll.voteCounts.filter((votes) => votes === maxVotes).length > 1;
    return isTie ? -1 : winningIndex;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading poll...</p>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.errorState}>
            <AlertCircle size={48} className={styles.errorIcon} />
            <h2>{error || 'Poll not found'}</h2>
            <p>The poll you're looking for doesn't exist or has been removed.</p>
            <button onClick={() => navigate('/')} className={styles.backButton}>
              <ArrowLeft size={18} />
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasVoted = !!poll.userVote;
  const showResults = hasVoted || !poll.isActive;
  const winningOption = getWinningOption();

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.pollInfo}>
            <h1 className={styles.pollName}>{poll.name}</h1>
            <div className={styles.pollMeta}>
              <div className={styles.pollCode}>
                <Vote size={16} />
                Code: <span>{poll.code}</span>
              </div>
              <div className={`${styles.timer} ${!poll.isActive ? styles.expired : ''}`}>
                <Clock size={16} />
                {getTimeRemaining(poll.validTill)}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.questionSection}>
          <h2 className={styles.question}>{poll.question}</h2>
          {poll.multipleChoices && !showResults && (
            <div className={styles.multipleChoiceHint}>
              <Check size={16} />
              Multiple choices allowed
            </div>
          )}
        </div>

        <div className={styles.answers}>
          {poll.answers.map((answer, index) => {
            const votes = poll.voteCounts[index];
            const percentage = calculatePercentage(votes, poll.totalVotes);
            const isSelected = selectedOptions.includes(index);
            const isUserVote = hasVoted && poll.userVote?.includes(index);
            const isWinning = showResults && winningOption === index;

            return (
              <div
                key={index}
                className={`${styles.answer} ${showResults ? styles.results : ''} ${
                  isSelected ? styles.selected : ''
                } ${isUserVote ? styles.userVote : ''} ${isWinning ? styles.winning : ''}`}
                onClick={() => !showResults && handleOptionSelect(index)}
              >
                <div className={styles.answerHeader}>
                  <div className={styles.answerText}>
                    <span className={styles.answerLabel}>{answer}</span>
                    {showResults && (
                      <span className={styles.voteCount}>
                        {votes} {votes === 1 ? 'vote' : 'votes'}
                      </span>
                    )}
                  </div>

                  <div className={styles.answerIndicators}>
                    {isWinning && <Crown size={20} className={styles.winningIcon} />}
                    {isUserVote && <CheckCircle2 size={20} className={styles.userVoteIcon} />}
                    {!showResults && isSelected && (
                      <Check size={20} className={styles.selectedIcon} />
                    )}
                    {showResults && <div className={styles.percentage}>{percentage}%</div>}
                  </div>
                </div>

                {showResults && (
                  <div className={styles.progressContainer}>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!showResults && (
          <div className={styles.voteSection}>
            <button
              onClick={submitVote}
              disabled={selectedOptions.length === 0 || isSubmitting}
              className={styles.voteButton}
            >
              {isSubmitting ? (
                <>
                  <div className={styles.spinner}></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Vote size={20} />
                  <span>Vote</span>{' '}
                  {selectedOptions.length > 0 && `(${selectedOptions.length} selected)`}
                </>
              )}
            </button>
          </div>
        )}

        {showResults && (
          <div className={styles.resultsInfo}>
            <div className={styles.resultsHeader}>
              <BarChart3 size={24} className={styles.resultsIcon} />
              <h3>Poll Results</h3>
            </div>
            <div className={styles.resultsStats}>
              <div className={styles.totalVotes}>
                <Users size={18} />
                Total Votes: {poll.totalVotes}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Poll;
