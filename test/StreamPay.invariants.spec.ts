import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("StreamPay - Invariants & Edge Cases (Issue #8)", function () {

  async function deployFixture() {
    const [sender, recipient] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockERC20");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const StreamPay = await ethers.getContractFactory("StreamPay");
    const sp = await StreamPay.deploy();
    await sp.waitForDeployment();

    const deposit = ethers.parseEther("100");
    await token.mint(sender.address, deposit);
    await token.connect(sender).approve(await sp.getAddress(), deposit);

    const now = await time.latest();
    const start = now + 10;
    const cliff = start + 50;
    const end = start + 200;

    await sp.connect(sender).createStream(
      await token.getAddress(),
      recipient.address,
      deposit,
      start,
      cliff,
      end,
      true
    );

    return { sp, sender, recipient, deposit, start, cliff, end };
  }

  /* =============================================================
                            INVARIANTS
     ============================================================= */

  it("withdrawn <= vested <= deposit invariant holds", async function () {
    const { sp, recipient, deposit, cliff } = await deployFixture();

    await time.increaseTo(cliff + 50);

    const vested = await sp.withdrawableAmount(1);
    const partial = vested / 2n;

    await sp.connect(recipient).withdraw(1, partial);

    const stream = await sp.getStream(1);
    const vestedNow = await sp.vestedAmount(1, BigInt(await time.latest()));

    expect(stream.withdrawn).to.be.lte(vestedNow);
    expect(vestedNow).to.be.lte(deposit);
  });

  it("withdrawableAmount never negative", async function () {
    const { sp, recipient, cliff } = await deployFixture();

    await time.increaseTo(cliff + 20);

    const available = await sp.withdrawableAmount(1);

    await sp.connect(recipient).withdraw(1, available);

    const withdrawableAfter = await sp.withdrawableAmount(1);

    expect(withdrawableAfter).to.equal(0n);
  });

  /* =============================================================
                            TIME EDGE CASES
     ============================================================= */

  it("exact startTime returns zero vested", async function () {
    const { sp, start } = await deployFixture();

    expect(await sp.vestedAmount(1, BigInt(start))).to.equal(0n);
  });

  it("exact cliffTime computes correct linear value", async function () {
    const { sp, deposit, start, cliff, end } = await deployFixture();

    const expected =
      (deposit * BigInt(cliff - start)) /
      BigInt(end - start);

    const vested = await sp.vestedAmount(1, BigInt(cliff));

    expect(vested).to.equal(expected);
  });

  it("exact endTime equals full deposit", async function () {
    const { sp, deposit, end } = await deployFixture();

    expect(await sp.vestedAmount(1, BigInt(end))).to.equal(deposit);
  });

  /* =============================================================
                            MONOTONICITY
     ============================================================= */

  it("vesting is monotonic (never decreases)", async function () {
    const { sp, cliff } = await deployFixture();

    await time.increaseTo(cliff + 10);
    const v1 = await sp.withdrawableAmount(1);

    await time.increase(20);
    const v2 = await sp.withdrawableAmount(1);

    expect(v2).to.be.greaterThanOrEqual(v1);
  });

  /* =============================================================
                            CANCEL FREEZE
     ============================================================= */

  it("vesting does not increase after cancellation", async function () {
    const { sp, sender, cliff } = await deployFixture();

    await time.increaseTo(cliff + 20);

    await sp.connect(sender).cancel(1);

    const vestedAfterCancel = await sp.withdrawableAmount(1);

    await time.increase(1000);

    const vestedLater = await sp.withdrawableAmount(1);

    expect(vestedLater).to.equal(vestedAfterCancel);
  });

});
